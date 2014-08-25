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
        var Role = schema.loadDefinition('Role');

        router.get('/roles/:id', function(req, res, next) {
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

                    if (!role.rolesRead) {
                        err = new Error('Access forbidden');
                        err.status = 403;

                        return next(err);
                    }

                    Collection.findOne({
                        where: {
                            name: 'Roles'
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

                            if ((permission.isShared() || permission.isPrivate()) && (req.params.id !== role.id)) {
                                err = new Error('Access forbidden');
                                err.status = 403;

                                return next(err);
                            }

                            Role.find(req.params.id, function(err, role) {
                                if (err) {
                                    return next(err);
                                }

                                if (!role) {
                                    err = new Error('Role not found');
                                    err.status = 404;

                                    return next(err);
                                }

                                role.groups(function(err, groups) {
                                    if (err) {
                                        return next(err);
                                    }

                                    if (!groups) {
                                        groups = {};
                                    }

                                    data.role = {
                                        id: role.id,
                                        name: role.name,
                                        usersCreate: role.usersCreate,
                                        usersRead: role.usersRead,
                                        usersUpdate: role.usersUpdate,
                                        usersDelete: role.usersDelete,
                                        groupsCreate: role.groupsCreate,
                                        groupsRead: role.groupsRead,
                                        groupsUpdate: role.groupsUpdate,
                                        groupsDelete: role.groupsDelete,
                                        rolesCreate: role.rolesCreate,
                                        rolesRead: role.rolesRead,
                                        rolesUpdate: role.rolesUpdate,
                                        rolesDelete: role.rolesDelete,
                                        pagesCreate: role.pagesCreate,
                                        pagesRead: role.pagesRead,
                                        pagesUpdate: role.pagesUpdate,
                                        pagesDelete: role.pagesDelete,
                                        postsCreate: role.postsCreate,
                                        postsRead: role.postsRead,
                                        postsUpdate: role.postsUpdate,
                                        postsDelete: role.postsDelete,
                                        commentsCreate: role.commentsCreate,
                                        commentsRead: role.commentsRead,
                                        commentsUpdate: role.commentsUpdate,
                                        commentsDelete: role.commentsDelete,
                                        group: _.pluck(groups, 'id')
                                    };

                                    return res.json(data);
                                });
                            });
                        });
                    });
                });
            });
        });

        router.get('/roles', function(req, res, next) {
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

                    if (!role.rolesRead) {
                        err = new Error('Access forbidden');
                        err.status = 403;

                        return next(err);
                    }

                    Collection.findOne({
                        where: {
                            name: 'Roles'
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

                                data.role = [];

                                var iterate = function(id) {
                                    if (permission.isPrivate() && (id !== role.id)) {
                                        err = new Error('Access forbidden');
                                        err.status = 403;

                                        return next(err);
                                    }

                                    Role.find(req.params.id, function(err, role) {
                                        if (err) {
                                            return next(err);
                                        }

                                        if (!role) {
                                            err = new Error('Role not found');
                                            err.status = 404;

                                            return next(err);
                                        }

                                        role.groups(function(err, groups) {
                                            if (err) {
                                                return next(err);
                                            }

                                            if (!groups) {
                                                groups = {};
                                            }

                                            data.role = {
                                                id: role.id,
                                                name: role.name,
                                                usersCreate: role.usersCreate,
                                                usersRead: role.usersRead,
                                                usersUpdate: role.usersUpdate,
                                                usersDelete: role.usersDelete,
                                                groupsCreate: role.groupsCreate,
                                                groupsRead: role.groupsRead,
                                                groupsUpdate: role.groupsUpdate,
                                                groupsDelete: role.groupsDelete,
                                                rolesCreate: role.rolesCreate,
                                                rolesRead: role.rolesRead,
                                                rolesUpdate: role.rolesUpdate,
                                                rolesDelete: role.rolesDelete,
                                                pagesCreate: role.pagesCreate,
                                                pagesRead: role.pagesRead,
                                                pagesUpdate: role.pagesUpdate,
                                                pagesDelete: role.pagesDelete,
                                                postsCreate: role.postsCreate,
                                                postsRead: role.postsRead,
                                                postsUpdate: role.postsUpdate,
                                                postsDelete: role.postsDelete,
                                                commentsCreate: role.commentsCreate,
                                                commentsRead: role.commentsRead,
                                                commentsUpdate: role.commentsUpdate,
                                                commentsDelete: role.commentsDelete,
                                                group: _.pluck(groups, 'id')
                                            };

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

                                if (permission.isPrivate() && (req.params.id !== role.id)) {
                                    filter.id = role.id;
                                }

                                if (Object.keys(filter).length === 0) {
                                    filter = null;
                                }

                                var order = req.query.order || 'id';
                                var sort = (req.query.sort === 'false' ? 'DESC' : 'ASC');
                                var offset = parseInt(req.query.offset, 10) || 0;
                                var limit = parseInt(req.query.limit, 10) || config.server.api.maxItems;

                                Role.all({
                                    where: filter,
                                    order: order + ' ' + sort,
                                    skip: offset,
                                    limit: limit
                                }, function(err, roles) {
                                    if (err) {
                                        return next(err);
                                    }

                                    Role.count(function(err, count) {
                                        if (err) {
                                            return next(err);
                                        }

                                        data.role = [];

                                        data.meta = {
                                            total: count
                                        };

                                        if (!roles) {
                                            return res.json(data);
                                        }

                                        var pending = roles.length;

                                        var iterate = function(role) {
                                            role.groups(function(err, groups) {
                                                if (err) {
                                                    return next(err);
                                                }

                                                if (!groups) {
                                                    groups = {};
                                                }

                                                data.role.push({
                                                    id: role.id,
                                                    usersCreate: role.usersCreate,
                                                    usersRead: role.usersRead,
                                                    usersUpdate: role.usersUpdate,
                                                    usersDelete: role.usersDelete,
                                                    groupsCreate: role.groupsCreate,
                                                    groupsRead: role.groupsRead,
                                                    groupsUpdate: role.groupsUpdate,
                                                    groupsDelete: role.groupsDelete,
                                                    rolesCreate: role.rolesCreate,
                                                    rolesRead: role.rolesRead,
                                                    rolesUpdate: role.rolesUpdate,
                                                    rolesDelete: role.rolesDelete,
                                                    pagesCreate: role.pagesCreate,
                                                    pagesRead: role.pagesRead,
                                                    pagesUpdate: role.pagesUpdate,
                                                    pagesDelete: role.pagesDelete,
                                                    postsCreate: role.postsCreate,
                                                    postsRead: role.postsRead,
                                                    postsUpdate: role.postsUpdate,
                                                    postsDelete: role.postsDelete,
                                                    commentsCreate: role.commentsCreate,
                                                    commentsRead: role.commentsRead,
                                                    commentsUpdate: role.commentsUpdate,
                                                    commentsDelete: role.commentsDelete,
                                                    group: _.pluck(groups, 'id')
                                                });

                                                if (!--pending) {
                                                    return res.json(data);
                                                }
                                            });
                                        };

                                        for (var i = 0; i < roles.length; i++) {
                                            iterate(roles[i]);
                                        }
                                    });
                                });
                            }
                        });
                    });
                });
            });
        });

        router.put('/roles/:id', function(req, res, next) {
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

                    if (!role.rolesUpdate) {
                        err = new Error('Access forbidden');
                        err.status = 403;

                        return next(err);
                    }

                    Collection.findOne({
                        where: {
                            name: 'Roles'
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

                            if ((permission.isShared() || permission.isPrivate()) && (req.params.id !== role.id)) {
                                err = new Error('Access forbidden');
                                err.status = 403;

                                return next(err);
                            }

                            Role.find(req.params.id, function(err, role) {
                                if (err) {
                                    return next(err);
                                }

                                if (!role) {
                                    err = new Error('Role not found');
                                    err.status = 404;

                                    return next(err);
                                }

                                role.update(req.body.role, function(err) {
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

        router.post('/roles', function(req, res, next) {
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

                    if (!role.rolesCreate) {
                        err = new Error('Access forbidden');
                        err.status = 403;

                        return next(err);
                    }

                    Collection.findOne({
                        where: {
                            name: 'Roles'
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

                            var role = new Role(req.body.role);

                            role.save(function(err) {
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

        router.delete('/roles/:id', function(req, res, next) {
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

                    if (!role.rolesDelete) {
                        err = new Error('Access forbidden');
                        err.status = 403;

                        return next(err);
                    }

                    Collection.findOne({
                        where: {
                            name: 'Roles'
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

                            if ((permission.isShared() || permission.isPrivate()) && (req.params.id !== group.roleId)) {
                                err = new Error('Access forbidden');
                                err.status = 403;

                                return next(err);
                            }

                            Role.find(req.params.id, function(err, role) {
                                if (err) {
                                    return next(err);
                                }

                                if (!role) {
                                    err = new Error('Role not found');
                                    err.status = 404;

                                    return next(err);
                                }

                                role.destroy(function(err) {
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