(function() {
    'use strict';

    var path = require('path');
    var _ = require('lodash');

    var Schema = require('jugglingdb-model-loader');

    module.exports = function(config, router) {
        var schema = new Schema(config.database.type, {
            host: config.database.host,
            port: config.database.port,
            database: config.database.name,
            modelLoader: {
                rootDirectory: path.normalize(__dirname + '/../../..'),
                directory: 'app/models'
            }
        });

        var Collection = schema.loadDefinition('Collection');
        var User = schema.loadDefinition('User');

        router.get('/users/:id', function(req, res, next) {
            var data = {};
            var err;

            if (!req.user) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            req.user.group(function(err, group) {
                if (err) {
                    return next(err);
                }

                if (!group) {
                    err = new Error('Group not found');
                    err.status = 500;

                    return next(err);
                }

                group.role(function(err, role) {
                    if (err) {
                        return next(err);
                    }

                    if (!role) {
                        err = new Error('Role not found');
                        err.status = 500;

                        return next(err);
                    }

                    if (!role.usersRead) {
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

                        collection.permission(function(err, permission) {
                            if (err) {
                                return next(err);
                            }

                            if (!permission) {
                                err = new Error('Permission not found');
                                err.status = 500;

                                return next(err);
                            }

                            if (permission.isPrivate() && (req.params.id !== req.user.id)) {
                                err = new Error('Access forbidden');
                                err.status = 403;

                                return next(err);
                            }

                            User.find(req.params.id, function(err, user) {
                                if (err) {
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
                    });
                });
            });
        });

        router.get('/users', function(req, res, next) {
            var data = {};
            var err;

            if (!req.user) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            req.user.group(function(err, group) {
                if (err) {
                    return next(err);
                }

                if (!group) {
                    err = new Error('Group not found');
                    err.status = 500;

                    return next(err);
                }

                group.role(function(err, role) {
                    if (err) {
                        return next(err);
                    }

                    if (!role) {
                        err = new Error('Role not found');
                        err.status = 500;

                        return next(err);
                    }

                    if (!role.usersRead) {
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

                        collection.permission(function(err, permission) {
                            if (err) {
                                return next(err);
                            }

                            if (!permission) {
                                err = new Error('Permission not found');
                                err.status = 500;

                                return next(err);
                            }

                            if (req.query.ids) {
                                var pending = req.query.ids.length;

                                data.user = [];

                                var iterate = function(id) {
                                    if (permission.isPrivate() && (id !== req.user.id)) {
                                        err = new Error('Access forbidden');
                                        err.status = 403;

                                        return next(err);
                                    }

                                    User.find(id, function(err, user) {
                                        if (err) {
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

                                if (permission.isPrivate() && (req.params.id !== req.user.id)) {
                                    filter.id = req.user.id;
                                }

                                if (typeof req.query.email !== 'undefined') {
                                    filter.email = req.query.email;
                                }

                                if (typeof req.query.created !== 'undefined') {
                                    filter.email = req.query.created;
                                }

                                if (typeof req.query.enabled !== 'undefined') {
                                    filter.email = req.query.enabled;
                                }

                                if (Object.keys(filter).length === 0) {
                                    filter = null;
                                }

                                var order = req.query.order || 'id';
                                var sort = (req.query.sort === 'false' ? 'DESC' : 'ASC');
                                var offset = parseInt(req.query.offset, 10) || 0;
                                var limit = parseInt(req.query.limit, 10) || config.server.api.maxItems;

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
                    });
                });
            });
        });

        router.put('/users/:id', function(req, res, next) {
            var err;

            if (!req.user) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            req.user.group(function(err, group) {
                if (err) {
                    return next(err);
                }

                if (!group) {
                    err = new Error('Group not found');
                    err.status = 500;

                    return next(err);
                }

                group.role(function(err, role) {
                    if (err) {
                        return next(err);
                    }

                    if (!role) {
                        err = new Error('Role not found');
                        err.status = 500;

                        return next(err);
                    }

                    if (!role.usersUpdate) {
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

                        collection.permission(function(err, permission) {
                            if (err) {
                                return next(err);
                            }

                            if (!permission) {
                                err = new Error('Permission not found');
                                err.status = 500;

                                return next(err);
                            }

                            if (permission.isReadOnly()) {
                                err = new Error('Access forbidden');
                                err.status = 403;

                                return next(err);
                            }

                            if ((permission.isShared() || permission.isPrivate()) && (req.params.id !== req.user.id)) {
                                err = new Error('Access forbidden');
                                err.status = 403;

                                return next(err);
                            }

                            User.find(req.params.id, function(err, user) {
                                if (err) {
                                    return next(err);
                                }

                                if (!user) {
                                    err = new Error('User not found');
                                    err.status = 404;

                                    return next(err);
                                }

                                user.update(req.body.user, function(err) {
                                    if (err) {
                                        return next(err);
                                    }

                                    res.send(200);
                                });
                            });
                        });
                    });
                });
            });
        });

        router.post('/users', function(req, res, next) {
            var err;

            if (!req.user) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            req.user.group(function(err, group) {
                if (err) {
                    return next(err);
                }

                if (!group) {
                    err = new Error('Group not found');
                    err.status = 500;

                    return next(err);
                }

                group.role(function(err, role) {
                    if (err) {
                        return next(err);
                    }

                    if (!role) {
                        err = new Error('Role not found');
                        err.status = 500;

                        return next(err);
                    }

                    if (!role.usersCreate) {
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

                        collection.permission(function(err, permission) {
                            if (err) {
                                return next(err);
                            }

                            if (!permission) {
                                err = new Error('Permission not found');
                                err.status = 500;

                                return next(err);
                            }

                            if (permission.isReadOnly()) {
                                err = new Error('Access forbidden');
                                err.status = 403;

                                return next(err);
                            }

                            var user = new User(req.body.user);

                            user.save(function(err) {
                                if (err) {
                                    return next(err);
                                }

                                res.send(200);
                            });
                        });
                    });
                });
            });
        });

        router.delete('/users/:id', function(req, res, next) {
            var err;

            if (!req.user) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            req.user.group(function(err, group) {
                if (err) {
                    return next(err);
                }

                if (!group) {
                    err = new Error('Group not found');
                    err.status = 500;

                    return next(err);
                }

                group.role(function(err, role) {
                    if (err) {
                        return next(err);
                    }

                    if (!role) {
                        err = new Error('Role not found');
                        err.status = 500;

                        return next(err);
                    }

                    if (!role.usersDelete) {
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

                        collection.permission(function(err, permission) {
                            if (err) {
                                return next(err);
                            }

                            if (!permission) {
                                err = new Error('Permission not found');
                                err.status = 500;

                                return next(err);
                            }

                            if (permission.isReadOnly()) {
                                err = new Error('Access forbidden');
                                err.status = 403;

                                return next(err);
                            }

                            if ((permission.isShared() || permission.isPrivate()) && (req.params.id !== req.user.id)) {
                                err = new Error('Access forbidden');
                                err.status = 403;

                                return next(err);
                            }

                            User.find(req.params.id, function(err, user) {
                                if (err) {
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

                                    res.send(200);
                                });
                            });
                        });
                    });
                });
            });
        });
    };
}());