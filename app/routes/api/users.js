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

        var Collection = schema.loadDefinition('Collection');
        var User = schema.loadDefinition('User');

        router.use(function checkUser(req, res, next) {
            var err;

            if (!req.authenticated) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            var allow = false;

            switch (req.method) {
                case 'POST':
                    if (req.role.usersCreate) {
                        allow = true;
                    }
                    break;

                case 'GET':
                    if (req.role.usersRead) {
                        allow = true;
                    }
                    break;

                case 'PUT':
                    if (req.role.usersUpdate) {
                        allow = true;
                    }
                    break;

                case 'DELETE':
                    if (req.role.usersDelete) {
                        allow = true;
                    }
                    break;

                default:
                    err = new Error('Method not allowed');
                    err.status = 405;

                    return next(err);
            }

            if (!allow) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            Collection.findOne({
                where: {
                    name: 'Users'
                }
            }, function(err, collection) {
                if (err) {
                    return next(err);
                }

                if (!collection) {
                    err = new Error('Collection not found');
                    err.status = 500;

                    return next(err);
                }

                req.collection = collection;

                collection.permission(function(err, permission) {
                    if (err) {
                        return next(err);
                    }

                    if (!permission) {
                        err = new Error('Permission not found');
                        err.status = 500;

                        return next(err);
                    }

                    req.permission = permission;

                    return next();
                });
            });
        });

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

                    if (!keys) {
                        keys = {};
                    }

                    user.localAccounts(function(err, localAccounts) {
                        if (err) {
                            return next(err);
                        }

                        if (!localAccounts) {
                            localAccounts = {};
                        }

                        user.externAccounts(function(err, externAccounts) {
                            if (err) {
                                return next(err);
                            }

                            if (!externAccounts) {
                                externAccounts = {};
                            }

                            data.user = {
                                id: user.id,
                                email: user.email,
                                name: user.name,
                                enabled: user.enabled,
                                created: user.created,
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

                            if (!keys) {
                                keys = {};
                            }

                            user.localAccounts(function(err, localAccounts) {
                                if (err) {
                                    return next(err);
                                }

                                if (!localAccounts) {
                                    localAccounts = {};
                                }

                                user.externAccounts(function(err, externAccounts) {
                                    if (err) {
                                        return next(err);
                                    }

                                    if (!externAccounts) {
                                        externAccounts = {};
                                    }

                                    data.user.push({
                                        id: user.id,
                                        email: user.email,
                                        name: user.name,
                                        enabled: user.enabled,
                                        created: user.created,
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

                User.all({
                    where: filter,
                    order: order + ' ' + sort,
                    skip: offset,
                    limit: limit
                }, function(err, users) {
                    if (err) {
                        return next(err);
                    }

                    User.count(function(err, count) {
                        if (err) {
                            return next(err);
                        }

                        if (offset > count) {
                            err = new Error('Invalid parameter');
                            err.status = 422;

                            return next(err);
                        }

                        data.user = [];

                        data.meta = {
                            total: count
                        };

                        if (!users) {
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

                                if (!keys) {
                                    keys = {};
                                }

                                user.localAccounts(function(err, localAccounts) {
                                    if (err) {
                                        return next(err);
                                    }

                                    if (!localAccounts) {
                                        localAccounts = {};
                                    }

                                    user.externAccounts(function(err, externAccounts) {
                                        if (err) {
                                            return next(err);
                                        }

                                        if (!externAccounts) {
                                            externAccounts = {};
                                        }

                                        data.user.push({
                                            id: user.id,
                                            email: user.email,
                                            name: user.name,
                                            enabled: user.enabled,
                                            created: user.created,
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