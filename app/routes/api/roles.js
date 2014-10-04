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
        var Role = schema.loadDefinition('Role');

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
                    if (req.role.rolesCreate) {
                        allow = true;
                    }
                    break;

                case 'GET':
                    if (req.role.rolesRead) {
                        allow = true;
                    }
                    break;

                case 'PUT':
                    if (req.role.rolesUpdate) {
                        allow = true;
                    }
                    break;

                case 'DELETE':
                    if (req.role.rolesDelete) {
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

                    next();
                });
            });
        });

        router.post('/roles', function createRole(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            var role = new Role(req.body.role);

            if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && (role.id !== req.role.id)) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            role.save(function(err) {
                if (err) {
                    return next(err);
                }

                return res.send(200);
            });
        });

        router.get('/roles/:id', function readRole(req, res, next) {
            var data = {};

            Role.find(req.params.id, function(err, role) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && req.permission.isPrivate() && role && (role.id !== req.role.id)) {
                    err = new Error('Access forbidden');
                    err.status = 403;

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
                        keysCreate: role.keysCreate,
                        keysRead: role.keysRead,
                        keysUpdate: role.keysUpdate,
                        keysDelete: role.keysDelete,
                        localAccountsCreate: role.localAccountsCreate,
                        localAccountsRead: role.localAccountsRead,
                        localAccountsUpdate: role.localAccountsUpdate,
                        localAccountsDelete: role.localAccountsDelete,
                        externAccountsCreate: role.externAccountsCreate,
                        externAccountsRead: role.externAccountsRead,
                        externAccountsUpdate: role.externAccountsUpdate,
                        externAccountsDelete: role.externAccountsDelete,
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
                        categoriesCreate: role.categoriesCreate,
                        categoriesRead: role.categoriesRead,
                        categoriesUpdate: role.categoriesUpdate,
                        categoriesDelete: role.categoriesDelete,
                        tagsCreate: role.tagsCreate,
                        tagsRead: role.tagsRead,
                        tagsUpdate: role.tagsUpdate,
                        tagsDelete: role.tagsDelete,
                        group: _.pluck(groups, 'id')
                    };

                    return res.json(data);
                });
            });
        });

        router.get('/roles', function readRoles(req, res, next) {
            var data = {};
            var err;

            if (req.query.ids) {
                var pending = req.query.ids.length;

                data.role = [];

                var iterate = function(id) {
                    if (!req.user.admin && req.permission.isPrivate() && (id !== req.role.id)) {
                        err = new Error('Access forbidden');
                        err.status = 403;

                        return next(err);
                    }

                    Role.find(req.params.id, function(err, role) {
                        if (err) {
                            return next(err);
                        }

                        if (!req.user.admin && req.permission.isPrivate() && role && (role.id !== req.role.id)) {
                            err = new Error('Access forbidden');
                            err.status = 403;

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
                                keysCreate: role.keysCreate,
                                keysRead: role.keysRead,
                                keysUpdate: role.keysUpdate,
                                keysDelete: role.keysDelete,
                                localAccountsCreate: role.localAccountsCreate,
                                localAccountsRead: role.localAccountsRead,
                                localAccountsUpdate: role.localAccountsUpdate,
                                localAccountsDelete: role.localAccountsDelete,
                                externAccountsCreate: role.externAccountsCreate,
                                externAccountsRead: role.externAccountsRead,
                                externAccountsUpdate: role.externAccountsUpdate,
                                externAccountsDelete: role.externAccountsDelete,
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
                                categoriesCreate: role.categoriesCreate,
                                categoriesRead: role.categoriesRead,
                                categoriesUpdate: role.categoriesUpdate,
                                categoriesDelete: role.categoriesDelete,
                                tagsCreate: role.tagsCreate,
                                tagsRead: role.tagsRead,
                                tagsUpdate: role.tagsUpdate,
                                tagsDelete: role.tagsDelete,
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

                if (req.query.id) {
                    filter.id = req.query.id;
                }

                if (req.query.name) {
                    filter.name = req.query.name;
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

                Role.all({
                    where: filter,
                    order: order + ' ' + sort,
                    skip: offset,
                    limit: limit
                }, function(err, roles) {
                    if (err) {
                        return next(err);
                    }

                    if (offset > roles.length) {
                        err = new Error('Invalid parameter');
                        err.status = 422;

                        return next(err);
                    }

                    data.role = [];
                    data.meta = {
                        count: roles.length
                    };

                    if (!roles.length) {
                        return res.json(data);
                    }

                    var pending = roles.length;

                    var iterate = function(role) {
                        if (!req.user.admin && req.permission.isPrivate() && (role.id !== req.role.id)) {
                            err = new Error('Access forbidden');
                            err.status = 403;

                            return next(err);
                        }

                        role.groups(function(err, groups) {
                            if (err) {
                                return next(err);
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
                                keysCreate: role.keysCreate,
                                keysRead: role.keysRead,
                                keysUpdate: role.keysUpdate,
                                keysDelete: role.keysDelete,
                                localAccountsCreate: role.localAccountsCreate,
                                localAccountsRead: role.localAccountsRead,
                                localAccountsUpdate: role.localAccountsUpdate,
                                localAccountsDelete: role.localAccountsDelete,
                                externAccountsCreate: role.externAccountsCreate,
                                externAccountsRead: role.externAccountsRead,
                                externAccountsUpdate: role.externAccountsUpdate,
                                externAccountsDelete: role.externAccountsDelete,
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
                                categoriesCreate: role.categoriesCreate,
                                categoriesRead: role.categoriesRead,
                                categoriesUpdate: role.categoriesUpdate,
                                categoriesDelete: role.categoriesDelete,
                                tagsCreate: role.tagsCreate,
                                tagsRead: role.tagsRead,
                                tagsUpdate: role.tagsUpdate,
                                tagsDelete: role.tagsDelete,
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
            }
        });

        router.put('/roles/:id', function updateRole(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            Role.find(req.params.id, function(err, role) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && role && (role.id !== req.role.id)) {
                    err = new Error('Access forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!role) {
                    err = new Error('Role not found');
                    err.status = 404;

                    return next(err);
                }

                role.updateAttributes(req.body.role, function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.send(200);
                });
            });
        });

        router.delete('/roles/:id', function deleteRole(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            Role.find(req.params.id, function(err, role) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && role && (role.id !== req.role.id)) {
                    err = new Error('Access forbidden');
                    err.status = 403;

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

                    return res.send(200);
                });
            });
        });
    };
}());