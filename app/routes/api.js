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

    var auth = require('./api/auth');
    var users = require('./api/users');
    var groups = require('./api/groups');
    var roles = require('./api/roles');
    var localAccounts = require('./api/localaccounts');
    var externAccounts = require('./api/externaccounts');
    var keys = require('./api/keys');
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
        var User = schema.loadDefinition('User');

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

        router.use(function checkStatus(req, res, next)  {
            if (!config.server.api.enable) {
                res.status(503);

                return res.json({
                    success: false,
                    message: 'API server is not available'
                });
            }

            return next();
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
                        message: 'IP address is blacklisted'
                    });
                }

                return next();
            });
        });

        router.use(function checkAuthentication(req, res, next) {
            function updateUsersList(user, callback) {
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

            if (/^\/auth\//.test(req.path)) {
                return next();
            }

            var header = req.get('Authorization');
            var err;

            if (typeof header === 'undefined') {
                err = new Error('Authorization header not found');
                err.status = 401;

                return next(err);
            }

            var match = header.match(/^Basic (.+)$/);
            if (!match) {
                err = new Error('Invalid authorization header');
                err.status = 401;

                return next(err);
            }

            var token = new Buffer(match[1], 'base64').toString();

            Key.findOne({
                where: {
                    authkey: token,
                }
            }, function(err, key) {
                if (err) {
                    return next(err);
                }

                if (key) {
                    if (!key.enabled) {
                        err = new Error('Key disabled');
                        err.status = 403;

                        return next(err);
                    }

                    key.user(function(err, user) {
                        if (err) {
                            return next(err);
                        }

                        if (!user) {
                            err = new Error('User not found');
                            err.status = 401;

                            return next(err);
                        }

                        if (!user.enabled) {
                            err = new Error('User disabled');
                            err.status = 403;

                            return next(err);
                        }

                        user.group(function(err, group) {
                            if (err) {
                                return next(err);
                            }

                            if (!group) {
                                err = new Error('Group not found');
                                err.status = 403;

                                return next(err);
                            }

                            group.role(function(err, role) {
                                if (err) {
                                    return next(err);
                                }

                                if (!role) {
                                    err = new Error('Role not found');
                                    err.status = 403;

                                    return next(err);
                                }

                                updateUsersList(user, function(err) {
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
                                err = new Error('Bad authorization token');
                                err.status = 401;

                                return next(err);
                            }

                            User.find(id, function(err, user) {
                                if (err) {
                                    return next(err);
                                }

                                if (!user) {
                                    err = new Error('User not found');
                                    err.status = 401;

                                    return next(err);
                                }

                                if (!user.enabled) {
                                    err = new Error('User disabled');
                                    err.status = 403;

                                    return next(err);
                                }

                                user.group(function(err, group) {
                                    if (err) {
                                        return next(err);
                                    }

                                    if (!group) {
                                        err = new Error('Group not found');
                                        err.status = 403;

                                        return next(err);
                                    }

                                    group.role(function(err, role) {
                                        if (err) {
                                            return next(err);
                                        }

                                        if (!role) {
                                            err = new Error('Role not found');
                                            err.status = 403;

                                            return next(err);
                                        }

                                        r.expire(config.server.api.auth.redis.keyPrefix + config.server.api.auth.tokens.key + ':' + token,
                                            config.server.api.auth.tokens.expireTime, function(err) {
                                                if (err) {
                                                    return next(err);
                                                }

                                                updateUsersList(user, function(err) {
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

        auth(config, router, r);

        users(config, router);
        groups(config, router);
        roles(config, router);
        keys(config, router);
        localAccounts(config, router);
        externAccounts(config, router);
        pages(config, router);
        posts(config, router);
        comments(config, router);
        categories(config, router);
        tags(config, router);

        return router;
    };
}());