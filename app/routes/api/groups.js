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

        var Group = schema.loadDefinition('Group');

        router.post('/groups', function createGroup(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            var group = new Group(req.body.group);

            if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && (group.id !== req.group.id)) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            group.save(function(err) {
                if (err) {
                    return next(err);
                }

                return res.send(200).end();
            });
        });

        router.get('/groups/:id', function readGroup(req, res, next) {
            var data = {};

            Group.find(req.params.id, function(err, group) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && req.permission.isPrivate() && group && (group.id !== req.group.id)) {
                    err = new Error('Forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!group) {
                    err = new Error('Not Found');
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
            var err;

            if (req.query.ids) {
                var pending = req.query.ids.length;

                data.group = [];

                var iterate = function(id) {
                    Group.find(id, function(err, group) {
                        if (err) {
                            return next(err);
                        }

                        if (!req.user.admin && req.permission.isPrivate() && group && (group.id !== req.group.id)) {
                            err = new Error('Forbidden');
                            err.status = 403;

                            return next(err);
                        }

                        if (!group) {
                            err = new Error('Not Found');
                            err.status = 404;

                            return next(err);
                        }

                        group.users(function(err, users) {
                            if (err) {
                                return next(err);
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
                var sort = req.query.sort || 'ASC';
                var offset = parseInt(req.query.offset, 10) || 0;
                var limit = parseInt(req.query.limit, 10) || config.server.api.maxItems;
                if ((offset < 0) || (limit < 0)) {
                    err = new Error('Bad Request');
                    err.status = 400;

                    return next(err);
                }

                Group.count(filter, function(err, count) {
                    if (err) {
                        return next(err);
                    }

                    if (!count) {
                        err = new Error('Not Found');
                        err.status = 404;

                        return next(err);
                    }

                    if (offset >= count) {
                        err = new Error('Bad Request');
                        err.status = 400;

                        return next(err);
                    }

                    Group.all({
                        where: filter,
                        order: order + ' ' + sort,
                        skip: offset,
                        limit: limit
                    }, function(err, groups) {
                        if (err) {
                            return next(err);
                        }

                        if (!groups.length) {
                            err = new Error('Not Found');
                            err.status = 404;

                            return next(err);
                        }

                        data.group = [];
                        data.users = [];
                        data.meta = {
                            count: count
                        };

                        var pending = groups.length;

                        var iterate = function(group) {
                            if (!req.user.admin && req.permission.isPrivate() && (group.id !== req.group.id)) {
                                err = new Error('Forbidden');
                                err.status = 403;

                                return next(err);
                            }

                            group.users(function(err, users) {
                                if (err) {
                                    return next(err);
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
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            Group.find(req.params.id, function(err, group) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && group && (group.id !== req.group.id)) {
                    err = new Error('Forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!group) {
                    err = new Error('Not Found');
                    err.status = 404;

                    return next(err);
                }

                group.updateAttributes(req.body.group, function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.send(200).end();
                });
            });
        });

        router.delete('/groups/:id', function deleteGroup(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            Group.find(req.params.id, function(err, group) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && group && (group.id !== req.group.id)) {
                    err = new Error('Forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!group) {
                    err = new Error('Not Found');
                    err.status = 404;

                    return next(err);
                }

                group.destroy(function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.send(200).end();
                });
            });
        });
    };
}());