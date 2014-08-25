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
        var Group = schema.loadDefinition('Group');

        router.get('/groups/:id', function(req, res, next) {
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

                    if (!role.groupsRead) {
                        err = new Error('Access forbidden');
                        err.status = 403;

                        return next(err);
                    }

                    Collection.findOne({
                        where: {
                            name: 'Groups'
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

                            if ((permission.isShared() || permission.isPrivate()) && (req.params.id !== req.user.id)) {
                                err = new Error('Access forbidden');
                                err.status = 403;

                                return next(err);
                            }

                            Group.find(req.params.id, function(err, group) {
                                if (err) {
                                    return next(err);
                                }

                                if (!group) {
                                    err = new Error('Group not found');
                                    err.status = 404;

                                    return next(err);
                                }

                                group.role(function(err, role) {
                                    if (err) {
                                        return next(err);
                                    }

                                    group.users(function(err, users) {
                                        if (err) {
                                            return next(err);
                                        }

                                        if (!users) {
                                            users = {};
                                        }

                                        data.group = {
                                            id: group.id,
                                            name: group.name,
                                            created: group.created,
                                            role: role.id,
                                            users: _.pluck(users, 'id')
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

        router.get('/groups', function(req, res, next) {
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

                    if (!role.groupsRead) {
                        err = new Error('Access forbidden');
                        err.status = 403;

                        return next(err);
                    }

                    Collection.findOne({
                        where: {
                            name: 'Groups'
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

                                data.group = [];

                                var iterate = function(id) {
                                    if (permission.isPrivate() && (id !== req.user.groupId)) {
                                        err = new Error('Access forbidden');
                                        err.status = 403;

                                        return next(err);
                                    }

                                    Group.find(id, function(err, group) {
                                        if (err) {
                                            return next(err);
                                        }

                                        if (!group) {
                                            err = new Error('Group not found');
                                            err.status = 404;

                                            return next(err);
                                        }

                                        group.users(function(err, users) {
                                            if (err) {
                                                return next(err);
                                            }

                                            if (!users) {
                                                users = {};
                                            }

                                            data.group.push({
                                                id: group.id,
                                                name: group.name,
                                                created: group.created,
                                                role: group.roleId,
                                                users: _.pluck(users, 'id')
                                            });

                                            if (!--pending) {
                                                return res.json(data);
                                            }
                                        });
                                    });
                                };

                                for (var i = 0; i < req.query.ids.length; i++) {
                                    iterate(req.query.ids[i]);
                                }
                            } else {
                                var filter = {};

                                if (permission.isPrivate() && (req.params.id !== req.user.groupId)) {
                                    filter.id = req.user.groupId;
                                }

                                if (typeof req.query.name !== 'undefined') {
                                    filter.name = req.query.name;
                                }

                                if (typeof req.query.created !== 'undefined') {
                                    filter.email = req.query.created;
                                }

                                if (Object.keys(filter).length === 0) {
                                    filter = null;
                                }

                                var order = req.query.order || 'id';
                                var sort = (req.query.sort === 'false' ? 'DESC' : 'ASC');
                                var offset = parseInt(req.query.offset, 10) || 0;
                                var limit = parseInt(req.query.limit, 10) || config.server.api.maxItems;

                                Group.all({
                                    where: filter,
                                    order: order + ' ' + sort,
                                    skip: offset,
                                    limit: limit
                                }, function(err, groups) {
                                    if (err) {
                                        return next(err);
                                    }

                                    Group.count(function(err, count) {
                                        if (err) {
                                            return next(err);
                                        }

                                        data.group = [];
                                        data.users = [];

                                        data.meta = {
                                            total: count
                                        };

                                        if (!groups) {
                                            return res.json(data);
                                        }

                                        var pending = groups.length;

                                        var iterate = function(group) {
                                            group.users(function(err, users) {
                                                if (err) {
                                                    return next(err);
                                                }

                                                if (!users) {
                                                    users = {};
                                                }

                                                data.group.push({
                                                    id: group.id,
                                                    name: group.name,
                                                    created: group.created,
                                                    role: group.roleId,
                                                    users: _.pluck(users, 'id')
                                                });

                                                if (!--pending) {
                                                    return res.json(data);
                                                }

                                            });
                                        };

                                        for (var i = 0; i < groups.length; i++) {
                                            iterate(groups[i]);
                                        }
                                    });
                                });
                            }
                        });
                    });
                });
            });
        });

        router.put('/groups/:id', function(req, res, next) {
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

                    if (!role.groupsUpdate) {
                        err = new Error('Access forbidden');
                        err.status = 403;

                        return next(err);
                    }

                    Collection.findOne({
                        where: {
                            name: 'Groups'
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

                            if ((permission.isShared() || permission.isPrivate()) && (req.params.id !== req.user.groupId)) {
                                err = new Error('Access forbidden');
                                err.status = 403;

                                return next(err);
                            }

                            Group.find(req.params.id, function(err, group) {
                                if (err) {
                                    return next(err);
                                }

                                if (!group) {
                                    err = new Error('Group not found');
                                    err.status = 404;

                                    return next(err);
                                }

                                group.update(req.body.group, function(err) {
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

        router.post('/groups', function(req, res, next) {
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

                    if (!role.groupsCreate) {
                        err = new Error('Access forbidden');
                        err.status = 403;

                        return next(err);
                    }

                    Collection.findOne({
                        where: {
                            name: 'Groups'
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

                            var group = new Group(req.body.group);

                            group.save(function(err) {
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

        router.delete('/groups/:id', function(req, res, next) {
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

                    if (!role.groupsDelete) {
                        err = new Error('Access forbidden');
                        err.status = 403;

                        return next(err);
                    }

                    Collection.findOne({
                        where: {
                            name: 'Groups'
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

                            if ((permission.isShared() || permission.isPrivate()) && (req.params.id !== req.user.groupId)) {
                                err = new Error('Access forbidden');
                                err.status = 403;

                                return next(err);
                            }

                            Group.find(req.params.id, function(err, group) {
                                if (err) {
                                    return next(err);
                                }

                                if (!group) {
                                    err = new Error('Group not found');
                                    err.status = 404;

                                    return next(err);
                                }

                                group.destroy(function(err) {
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