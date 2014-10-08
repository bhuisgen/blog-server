(function() {
    'use strict';

    var path = require('path');
    var _ = require('lodash');

    var Schema = require('jugglingdb-model-loader');

    module.exports = function(config, router) {
        var options = config.database.options;

        options.modelLoader = {
            rootDirectory: path.normalize(__dirname + '/../../..'),
            directory: 'app/models'
        };

        var schema = new Schema(config.database.type, options);

        var User = schema.loadDefinition('User');

        router.post('/users', function createUser(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            var user = new User(req.body.user);

            if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && (user.id !== req.user.id)) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            user.save(function(err) {
                if (err) {
                    return next(err);
                }

                return res.send(200);
            });
        });

        router.get('/users/:id', function readUser(req, res, next) {
            var data = {};

            User.find(req.params.id, function(err, user) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && req.permission.isPrivate() && user && (user.id !== req.user.id)) {
                    err = new Error('Access forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!user) {
                    err = new Error('User not found');
                    err.status = 404;

                    return next(err);
                }

                user.keys(function(err, keys) {
                    if (err) {
                        return next(err);
                    }

                    user.localAccounts(function(err, localAccounts) {
                        if (err) {
                            return next(err);
                        }

                        user.externAccounts(function(err, externAccounts) {
                            if (err) {
                                return next(err);
                            }

                            data.user = {
                                id: user.id,
                                email: user.email,
                                name: user.name,
                                created: user.created,
                                lastLogin: user.lastLogin,
                                enabled: user.enabled,
                                admin: user.admin,
                                group: user.groupId,
                                keys: _.pluck(keys, 'id'),
                                localAccounts: _.pluck(localAccounts, 'id'),
                                externAccounts: _.pluck(externAccounts, 'id')
                            };

                            return res.json(data);
                        });
                    });
                });
            });
        });

        router.get('/users', function readUsers(req, res, next) {
            var data = {};
            var err;

            if (req.query.ids) {
                var pending = req.query.ids.length;

                data.user = [];

                var iterate = function(id) {
                    User.find(id, function(err, user) {
                        if (err) {
                            return next(err);
                        }

                        if (!req.user.admin && req.permission.isPrivate() && user && (user.id !== req.user.id)) {
                            err = new Error('Access forbidden');
                            err.status = 403;

                            return next(err);
                        }

                        if (!user) {
                            err = new Error('User not found');
                            err.status = 404;

                            return next(err);
                        }

                        user.keys(function(err, keys) {
                            if (err) {
                                return next(err);
                            }

                            user.localAccounts(function(err, localAccounts) {
                                if (err) {
                                    return next(err);
                                }

                                user.externAccounts(function(err, externAccounts) {
                                    if (err) {
                                        return next(err);
                                    }

                                    data.user.push({
                                        id: user.id,
                                        email: user.email,
                                        name: user.name,
                                        created: user.created,
                                        lastLogin: user.lastLogin,
                                        enabled: user.enabled,
                                        admin: user.admin,
                                        group: user.groupId,
                                        keys: _.pluck(keys, 'id'),
                                        localAccounts: _.pluck(localAccounts, 'id'),
                                        externAccounts: _.pluck(externAccounts, 'id')
                                    });

                                    if (!--pending) {
                                        return res.json(data);
                                    }
                                });
                            });
                        });
                    });
                };

                for (var i = 0; i < req.query.ids.length; i++) {
                    iterate(req.query.ids[i]);
                }
            } else {
                var filter = {};

                if (req.query.id) {
                    filter.id = req.query.id;
                }

                if (req.query.email) {
                    filter.email = req.query.email;
                }

                if (req.query.name) {
                    filter.name = req.query.name;
                }

                if (req.query.created) {
                    filter.email = req.query.created;
                }

                if (req.query.lastLogin) {
                    filter.email = req.query.lastLogin;
                }

                if (Object.keys(filter).length === 0) {
                    filter = null;
                }

                var order = req.query.order || 'id';
                var sort = (req.query.sort === 'false' ? 'DESC' : 'ASC');
                var offset = parseInt(req.query.offset, 10) || 0;
                var limit = parseInt(req.query.limit, 10) || config.server.api.maxItems;
                if ((offset < 0) || (limit < 0)) {
                    err = new Error('Invalid parameter');
                    err.status = 422;

                    return next(err);
                }

                User.count(filter, function(err, count) {
                    if (err) {
                        return next(err);
                    }

                    data.user = [];
                    data.meta = {
                        count: count
                    };

                    if (!count) {
                        return res.json(data);
                    }

                    if (offset >= count) {
                        err = new Error('Invalid parameter');
                        err.status = 422;

                        return next(err);
                    }

                    User.all({
                        where: filter,
                        order: order + ' ' + sort,
                        skip: offset,
                        limit: limit
                    }, function(err, users) {
                        if (err) {
                            return next(err);
                        }

                        if (!users.length) {
                            return res.json(data);
                        }

                        var pending = users.length;

                        data.user = [];

                        var iterate = function(user) {
                            if (!req.user.admin && req.permission.isPrivate() && (user.id !== req.user.id)) {
                                err = new Error('Access forbidden');
                                err.status = 403;

                                return next(err);
                            }

                            user.keys(function(err, keys) {
                                if (err) {
                                    return next(err);
                                }

                                user.localAccounts(function(err, localAccounts) {
                                    if (err) {
                                        return next(err);
                                    }

                                    user.externAccounts(function(err, externAccounts) {
                                        if (err) {
                                            return next(err);
                                        }

                                        data.user.push({
                                            id: user.id,
                                            email: user.email,
                                            name: user.name,
                                            created: user.created,
                                            lastLogin: user.lastLogin,
                                            enabled: user.enabled,
                                            admin: user.admin,
                                            group: user.groupId,
                                            keys: _.pluck(keys, 'id'),
                                            localAccounts: _.pluck(localAccounts, 'id'),
                                            externAccounts: _.pluck(externAccounts, 'id')
                                        });

                                        if (!--pending) {
                                            return res.json(data);
                                        }
                                    });
                                });
                            });
                        };

                        for (var i = 0; i < users.length; i++) {
                            iterate(users[i]);
                        }
                    });
                });
            }
        });

        router.put('/users/:id', function updateUser(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            User.find(req.params.id, function(err, user) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && user && (user.id !== req.user.id)) {
                    err = new Error('Access forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!user) {
                    err = new Error('User not found');
                    err.status = 404;

                    return next(err);
                }

                user.updateAttributes(req.body.user, function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.send(200);
                });
            });
        });

        router.delete('/users/:id', function deleteUser(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            User.find(req.params.id, function(err, user) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && user && (user.id !== req.user.id)) {
                    err = new Error('Access forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!user) {
                    err = new Error('User not found');
                    err.status = 404;

                    return next(err);
                }

                user.destroy(function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.send(200);
                });
            });
        });
    };
}());