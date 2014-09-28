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
        var Group = schema.loadDefinition('Group');

        router.use(function checkUser(req, res, next) {
            var err;

            if (!req.user || !req.group || !req.role) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            var allow = false;

            switch (req.method) {
                case 'POST':
                    if (req.role.groupsCreate) {
                        allow = true;
                    }
                    break;

                case 'GET':
                    if (req.role.groupsRead) {
                        allow = true;
                    }
                    break;

                case 'PUT':
                    if (req.role.groupsUpdate) {
                        allow = true;
                    }
                    break;

                case 'DELETE':
                    if (req.role.groupsDelete) {
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

        router.post('/groups', function createGroup(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            var group = new Group(req.body.group);

            if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && (group.id !== req.group.id)) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            group.save(function(err) {
                if (err) {
                    return next(err);
                }

                return res.send(200);
            });
        });

        router.get('/groups/:id', function readGroup(req, res, next) {
            var data = {};

            Group.find(req.params.id, function(err, group) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && req.permission.isPrivate() && group && (group.id !== req.group.id)) {
                    err = new Error('Access forbidden');
                    err.status = 403;

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

        router.get('/groups', function readGroups(req, res, next) {
            var data = {};

            if (req.query.ids) {
                var pending = req.query.ids.length;

                data.group = [];

                var iterate = function(id) {
                    Group.find(id, function(err, group) {
                        if (err) {
                            return next(err);
                        }

                        if (!req.user.admin && req.permission.isPrivate() && group && (group.id !== req.group.id)) {
                            err = new Error('Access forbidden');
                            err.status = 403;

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

                if (req.query.id) {
                    filter.id = req.quqery.id;
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
                            if (!req.user.admin && req.permission.isPrivate() && (group.id !== req.group.id)) {
                                err = new Error('Access forbidden');
                                err.status = 403;

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
                        };

                        for (var i = 0; i < groups.length; i++) {
                            iterate(groups[i]);
                        }
                    });
                });
            }
        });

        router.put('/groups/:id', function updateGroup(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            Group.find(req.params.id, function(err, group) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && group && (group.id !== req.group.id)) {
                    err = new Error('Access forbidden');
                    err.status = 403;

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

                    return res.send(200);
                });
            });
        });

        router.delete('/groups/:id', function deleteGroup(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            Group.find(req.params.id, function(err, group) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && group && (group.id !== req.group.id)) {
                    err = new Error('Access forbidden');
                    err.status = 403;

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

                    return res.send(200);
                });
            });
        });
    };
}());