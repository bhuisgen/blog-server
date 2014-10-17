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

        var Role = schema.loadDefinition('Role');

        router.post('/roles', function createRole(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            var role = new Role(req.body.role);

            if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && (role.id !== req.role.id)) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            role.save(function(err) {
                if (err) {
                    return next(err);
                }

                return res.status(200).end();
            });
        });

        router.get('/roles/:id', function readRole(req, res, next) {
            var data = {};

            Role.find(req.params.id, function(err, role) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && req.permission.isPrivate() && role && (role.id !== req.role.id)) {
                    err = new Error('Forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!role) {
                    err = new Error('Not Found');
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
                        variablesCreate: role.variablesCreate,
                        variablesRead: role.variablesRead,
                        variablesUpdate: role.variablesUpdate,
                        variablesDelete: role.variablesDelete,
                        blacklistIPsCreate: role.blacklistIPsCreate,
                        blacklistIPsRead: role.blacklistIPsRead,
                        blacklistIPsUpdate: role.blacklistIPsUpdate,
                        blacklistIPsDelete: role.blacklistIPsDelete,
                        blacklistEmailsCreate: role.blacklistEmailsCreate,
                        blacklistEmailsRead: role.blacklistEmailsRead,
                        blacklistEmailsUpdate: role.blacklistEmailsUpdate,
                        blacklistEmailsDelete: role.blacklistEmailsDelete,
                        blacklistNamesCreate: role.blacklistNamesCreate,
                        blacklistNamesRead: role.blacklistNamesRead,
                        blacklistNamesUpdate: role.blacklistNamesUpdate,
                        blacklistNamesDelete: role.blacklistNamesDelete,
                        pagesCreate: role.pagesCreate,
                        pagesRead: role.pagesRead,
                        pagesReadNotPublished: role.pagesReadNotPublished,
                        pagesUpdate: role.pagesUpdate,
                        pagesDelete: role.pagesDelete,
                        postsCreate: role.postsCreate,
                        postsRead: role.postsRead,
                        postsReadNotPublished: role.postsReadNotPublished,
                        postsUpdate: role.postsUpdate,
                        postsDelete: role.postsDelete,
                        commentsCreate: role.commentsCreate,
                        commentsRead: role.commentsRead,
                        commentsReadNotValidated: role.commentsReadNotValidated,
                        commentsReadNotAllowed: role.commentsReadNotAllowed,
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
                        err = new Error('Forbidden');
                        err.status = 403;

                        return next(err);
                    }

                    Role.find(req.params.id, function(err, role) {
                        if (err) {
                            return next(err);
                        }

                        if (!req.user.admin && req.permission.isPrivate() && role && (role.id !== req.role.id)) {
                            err = new Error('Forbidden');
                            err.status = 403;

                            return next(err);
                        }

                        if (!role) {
                            err = new Error('Not Found');
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
                                variablesCreate: role.variablesCreate,
                                variablesRead: role.variablesRead,
                                variablesUpdate: role.variablesUpdate,
                                variablesDelete: role.variablesDelete,
                                blacklistIPsCreate: role.blacklistIPsCreate,
                                blacklistIPsRead: role.blacklistIPsRead,
                                blacklistIPsUpdate: role.blacklistIPsUpdate,
                                blacklistIPsDelete: role.blacklistIPsDelete,
                                blacklistEmailsCreate: role.blacklistEmailsCreate,
                                blacklistEmailsRead: role.blacklistEmailsRead,
                                blacklistEmailsUpdate: role.blacklistEmailsUpdate,
                                blacklistEmailsDelete: role.blacklistEmailsDelete,
                                blacklistNamesCreate: role.blacklistNamesCreate,
                                blacklistNamesRead: role.blacklistNamesRead,
                                blacklistNamesUpdate: role.blacklistNamesUpdate,
                                blacklistNamesDelete: role.blacklistNamesDelete,
                                pagesCreate: role.pagesCreate,
                                pagesRead: role.pagesRead,
                                pagesReadNotPublished: role.pagesReadNotPublished,
                                pagesUpdate: role.pagesUpdate,
                                pagesDelete: role.pagesDelete,
                                postsCreate: role.postsCreate,
                                postsRead: role.postsRead,
                                postsReadNotPublished: role.postsReadNotPublished,
                                postsUpdate: role.postsUpdate,
                                postsDelete: role.postsDelete,
                                commentsCreate: role.commentsCreate,
                                commentsRead: role.commentsRead,
                                commentsReadNotValidated: role.commentsReadNotValidated,
                                commentsReadNotAllowed: role.commentsReadNotAllowed,
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
                var sort = req.query.sort || 'ASC';
                var offset = parseInt(req.query.offset, 10) || 0;
                var limit = parseInt(req.query.limit, 10) || config.server.api.maxItems;
                if ((offset < 0) || (limit < 0)) {
                    err = new Error('Bad Request');
                    err.status = 400;

                    return next(err);
                }

                Role.count(filter, function(err, count) {
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

                    Role.all({
                        where: filter,
                        order: order + ' ' + sort,
                        skip: offset,
                        limit: limit
                    }, function(err, roles) {
                        if (err) {
                            return next(err);
                        }

                        if (!roles.length) {
                            err = new Error('Not Found');
                            err.status = 404;

                            return next(err);
                        }

                        data.role = [];
                        data.meta = {
                            count: count
                        };

                        var pending = roles.length;

                        var iterate = function(role) {
                            if (!req.user.admin && req.permission.isPrivate() && (role.id !== req.role.id)) {
                                err = new Error('Forbidden');
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
                                    variablesCreate: role.variablesCreate,
                                    variablesRead: role.variablesRead,
                                    variablesUpdate: role.variablesUpdate,
                                    variablesDelete: role.variablesDelete,
                                    blacklistIPsCreate: role.blacklistIPsCreate,
                                    blacklistIPsRead: role.blacklistIPsRead,
                                    blacklistIPsUpdate: role.blacklistIPsUpdate,
                                    blacklistIPsDelete: role.blacklistIPsDelete,
                                    blacklistEmailsCreate: role.blacklistEmailsCreate,
                                    blacklistEmailsRead: role.blacklistEmailsRead,
                                    blacklistEmailsUpdate: role.blacklistEmailsUpdate,
                                    blacklistEmailsDelete: role.blacklistEmailsDelete,
                                    blacklistNamesCreate: role.blacklistNamesCreate,
                                    blacklistNamesRead: role.blacklistNamesRead,
                                    blacklistNamesUpdate: role.blacklistNamesUpdate,
                                    blacklistNamesDelete: role.blacklistNamesDelete,
                                    pagesCreate: role.pagesCreate,
                                    pagesRead: role.pagesRead,
                                    pagesReadNotPublished: role.pagesReadNotPublished,
                                    pagesUpdate: role.pagesUpdate,
                                    pagesDelete: role.pagesDelete,
                                    postsCreate: role.postsCreate,
                                    postsRead: role.postsRead,
                                    postsReadNotPublished: role.postsReadNotPublished,
                                    postsUpdate: role.postsUpdate,
                                    postsDelete: role.postsDelete,
                                    commentsCreate: role.commentsCreate,
                                    commentsRead: role.commentsRead,
                                    commentsReadNotValidated: role.commentsReadNotValidated,
                                    commentsReadNotAllowed: role.commentsReadNotAllowed,
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
                });
            }
        });

        router.put('/roles/:id', function updateRole(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            Role.find(req.params.id, function(err, role) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && role && (role.id !== req.role.id)) {
                    err = new Error('Forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!role) {
                    err = new Error('Not Found');
                    err.status = 404;

                    return next(err);
                }

                role.updateAttributes(req.body.role, function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.status(200).end();
                });
            });
        });

        router.delete('/roles/:id', function deleteRole(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            Role.find(req.params.id, function(err, role) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && role && (role.id !== req.role.id)) {
                    err = new Error('Forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!role) {
                    err = new Error('Not Found');
                    err.status = 404;

                    return next(err);
                }

                role.destroy(function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.status(200).end();
                });
            });
        });
    };
}());