(function() {
    'use strict';

    var crypto = require('crypto');
    var path = require('path');
    var redis = require('redis');
    var uuid = require('node-uuid');

    var express = require('express');

    var router = express.Router({
        caseSensitive: true,
        strict: true
    });

    var Schema = require('jugglingdb-model-loader');
    var Define = require('../define');

    var auth = require('./api/auth');
    var roles = require('./api/roles');
    var groups = require('./api/groups');
    var users = require('./api/users');
    var keys = require('./api/keys');
    var localAccounts = require('./api/localaccounts');
    var externAccounts = require('./api/externaccounts');
    var blacklistIPs = require('./api/blacklistips');
    var blacklistEmails = require('./api/blacklistemails');
    var blacklistNames = require('./api/blacklistnames');
    var variables = require('./api/variables');
    var pages = require('./api/pages');
    var posts = require('./api/posts');
    var comments = require('./api/comments');
    var categories = require('./api/categories');
    var tags = require('./api/tags');

    module.exports = function(config) {
        if (!config.server.api) {
            return router;
        }

        config.database = require('../../config/database');

        var options = config.database.options;

        options.modelLoader = {
            rootDirectory: path.normalize(__dirname + '/../..'),
            directory: 'app/models'
        };

        var schema = new Schema(config.database.type, options);

        var BlacklistIP = schema.loadDefinition('BlacklistIp');
        var Key = schema.loadDefinition('Key');
        var Route = schema.loadDefinition('Route');
        var User = schema.loadDefinition('User');
        var Variable = schema.loadDefinition('Variable');

        var r;

        if (config.server.api.auth.redis.socket) {
            r = redis.createClient(config.server.api.auth.redis.socket,
                config.server.api.auth.redis.options);
        } else {
            r = redis.createClient(config.server.api.auth.redis.port, config.server.api.auth.redis.host,
                config.server.api.auth.redis.options);
        }

        r.auth(config.server.api.auth.redis.password);

        r.on('connect', function onRedisConnect() {
            if (config.server.api.auth.redis.hasOwnProperty('database')) {
                r.select(config.server.api.auth.redis.database);
            }
        });

        r.on('error', function onRedisError(error) {
            console.error(error);
        });

        function registerUser(user, callback) {
            r.multi()
                .zadd(config.server.api.auth.redis.keyPrefix + config.server.api.auth.users.key,
                    new Date().getTime(), user.id)
                .zremrangebyscore(config.server.api.auth.redis.keyPrefix + config.server.api.auth.users.key,
                    new Date().getTime() + (config.server.api.auth.tokens.expireTime * 1000), '+inf')
                .exec(function(err, replies) {
                    if (err) {
                        return callback(err);
                    }

                    return callback(null);
                });
        }

        function unregisterUser(user, callback) {
            r.multi()
                .zrem(config.server.api.auth.redis.keyPrefix + config.server.api.auth.users.key, user.id)
                .zremrangebyscore(config.server.api.auth.redis.keyPrefix + config.server.api.auth.users.key,
                    new Date().getTime() + (config.server.api.auth.tokens.expireTime * 1000), '+inf')
                .exec(function(err, replies) {
                    if (err) {
                        return callback(err);
                    }

                    return callback(null);
                });
        }

        router.use(function checkServer(req, res, next)  {
            if (!config.server.api.enable) {
                res.status(503);

                return res.json({
                    success: false,
                    message: 'Service Unavailable'
                });
            }

            Variable.get(Define.VARIABLE.API_OFFLINE, function(err, value) {
                if (!err && (value === 'true')) {
                    res.status(503);

                    return res.json({
                        success: false,
                        message: 'Service Unavailable'
                    });
                }

                return next();
            });
        });

        router.use(function checkIP(req, res, next) {
            BlacklistIP.findOne({
                where: {
                    ip: req.ip
                }
            }, function(err, object) {
                if (err || object) {
                    res.status(403);

                    return res.json({
                        success: false,
                        message: 'Forbidden'
                    });
                }

                return next();
            });
        });

        router.use(function checkAPIVersion(req, res, next) {
            var header = req.get('Accepts');
            if (!header) {
                return next();
            }

            var match = header.match(/^application\/vnd\.api\.v(\d+)/);
            if (!match) {
                return next();
            }

            req.api = match[1];

            return next();
        });

        auth(config, router, r);

        router.post('/auth/signout', function signout(req, res, next) {
            if (!req.body.token) {
                res.status(401);

                return res.json({
                    success: false,
                    message: 'Unauthorized'
                });
            }

            var token = new Buffer(req.body.token, 'base64').toString('ascii');

            r.get(config.server.api.auth.redis.keyPrefix + config.server.api.auth.tokens.key + ':' + token, function(err, id) {
                if (err) {
                    return next(err);
                }

                if (!id) {
                    res.status(401);

                    return res.json({
                        success: false,
                        message: 'Unauthorized'
                    });
                }

                r.del(config.server.api.auth.redis.keyPrefix + config.server.api.auth.tokens.key + ':' + token, function(err) {
                    if (err) {
                        return next(err);
                    }

                    unregisterUser(id, function(err) {
                        if (err) {
                            return next(err);
                        }

                        return res.json({
                            success: true,
                            message: 'OK',
                        });
                    });
                });
            });
        });

        router.use(function checkAPIAuthentication(req, res, next) {
            var header = req.get('Authorization');
            var err;

            if (typeof header === 'undefined') {
                err = new Error('Unauthorized');
                err.status = 401;

                return next(err);
            }

            var match = header.match(/^Basic (.+)$/);
            if (!match) {
                err = new Error('Unauthorized');
                err.status = 401;

                return next(err);
            }

            var token = new Buffer(match[1], 'base64').toString();

            Key.findOne({
                where: {
                    authKey: token,
                }
            }, function(err, key) {
                if (err) {
                    return next(err);
                }

                if (key) {
                    if (!key.enabled) {
                        err = new Error('Forbidden');
                        err.status = 403;

                        return next(err);
                    }

                    key.user(function(err, user) {
                        if (err) {
                            return next(err);
                        }

                        if (!user) {
                            err = new Error('Forbidden');
                            err.status = 403;

                            return next(err);
                        }

                        if (!user.enabled) {
                            err = new Error('Forbidden');
                            err.status = 403;

                            return next(err);
                        }

                        user.group(function(err, group) {
                            if (err) {
                                return next(err);
                            }

                            if (!group) {
                                err = new Error('Forbidden');
                                err.status = 403;

                                return next(err);
                            }

                            group.role(function(err, role) {
                                if (err) {
                                    return next(err);
                                }

                                if (!role) {
                                    err = new Error('Forbidden');
                                    err.status = 403;

                                    return next(err);
                                }

                                registerUser(user, function(err) {
                                    if (err) {
                                        return next(err);
                                    }

                                    req.user = user;
                                    req.group = group;
                                    req.role = role;
                                    req.authenticated = true;

                                    return next();
                                });
                            });
                        });
                    });
                } else {
                    r.get(config.server.api.auth.redis.keyPrefix + config.server.api.auth.tokens.key + ':' + token,
                        function(err, id) {
                            if (err) {
                                return next(err);
                            }

                            if (!id) {
                                err = new Error('Unauthorized');
                                err.status = 401;

                                return next(err);
                            }

                            User.find(id, function(err, user) {
                                if (err) {
                                    return next(err);
                                }

                                if (!user) {
                                    err = new Error('Forbidden');
                                    err.status = 403;

                                    return next(err);
                                }

                                if (!user.enabled) {
                                    err = new Error('Forbidden');
                                    err.status = 403;

                                    return next(err);
                                }

                                user.group(function(err, group) {
                                    if (err) {
                                        return next(err);
                                    }

                                    if (!group) {
                                        err = new Error('Forbidden');
                                        err.status = 403;

                                        return next(err);
                                    }

                                    group.role(function(err, role) {
                                        if (err) {
                                            return next(err);
                                        }

                                        if (!role) {
                                            err = new Error('Forbidden');
                                            err.status = 403;

                                            return next(err);
                                        }

                                        r.expire(config.server.api.auth.redis.keyPrefix + config.server.api.auth.tokens.key + ':' + token,
                                            config.server.api.auth.tokens.expireTime,
                                            function(err) {
                                                if (err) {
                                                    return next(err);
                                                }

                                                registerUser(user, function(err) {
                                                    if (err) {
                                                        return next(err);
                                                    }

                                                    req.user = user;
                                                    req.group = group;
                                                    req.role = role;
                                                    req.authenticated = true;

                                                    return next();
                                                });
                                            });
                                    });
                                });
                            });
                        });
                }
            });
        });

        router.use(function checkAPIAccess(req, res, next) {
            var err;

            if (!req.authenticated) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            var match = req.path.match(/^\/(\w+)/);
            if (!match) {
                err = new Error('Method Not Allowed');
                err.status = 405;

                return next(err);
            }

            var allow = false;

            var item = match[1];

            switch (req.method) {
                case 'POST':
                    item += 'Create';
                    break;

                case 'GET':
                    item += 'Read';
                    break;

                case 'PUT':
                    item += 'Update';
                    break;

                case 'DELETE':
                    item += 'Delete';
                    break;

                default:
                    err = new Error('Bad Request');
                    err.status = 400;

                    return next(err);
            }

            if (item && req.role[item]) {
                allow = true;
            }

            if (!allow) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            Route.findOne({
                where: {
                    name: match[1]
                }
            }, function(err, route) {
                if (err) {
                    return next(err);
                }

                if (!route) {
                    err = new Error('Internal Server Error');
                    err.status = 500;

                    return next(err);
                }

                route.permission(function(err, permission) {
                    if (err) {
                        return next(err);
                    }

                    if (!permission) {
                        err = new Error('Internal Server Error');
                        err.status = 500;

                        return next(err);
                    }

                    req.permission = permission;

                    return next();
                });
            });
        });

        roles(config, router);
        groups(config, router);
        users(config, router);
        keys(config, router);
        localAccounts(config, router);
        externAccounts(config, router);
        blacklistIPs(config, router);
        blacklistEmails(config, router);
        blacklistNames(config, router);
        variables(config, router);
        pages(config, router);
        posts(config, router);
        comments(config, router);
        categories(config, router);
        tags(config, router);

        return router;
    };
}());