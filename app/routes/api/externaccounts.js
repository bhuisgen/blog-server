(function() {
    'use strict';

    var path = require('path');

    var Schema = require('jugglingdb-model-loader');

    module.exports = function(config, router) {
        var options = config.database.options;

        options.modelLoader = {
            rootDirectory: path.normalize(__dirname + '/../../..'),
            directory: 'app/models'
        };

        var schema = new Schema(config.database.type, options);

        var Collection = schema.loadDefinition('Collection');
        var ExternAccount = schema.loadDefinition('ExternAccount');

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
                    if (req.role.externAccountsCreate) {
                        allow = true;
                    }
                    break;

                case 'GET':
                    if (req.role.externAccountsRead) {
                        allow = true;
                    }
                    break;

                case 'PUT':
                    if (req.role.externAccountsUpdate) {
                        allow = true;
                    }
                    break;

                case 'DELETE':
                    if (req.role.externAccountsDelete) {
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
                    name: 'ExternAccounts'
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

        router.post('/externAccounts', function createExternAccount(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            var externAccount = new ExternAccount(req.body.externAccount);

            if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && (externAccount.userId !== req.user.id)) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            externAccount.save(function(err) {
                if (err) {
                    return next(err);
                }

                return res.send(200);
            });
        });

        router.get('/externAccounts/:id', function readExternAccount(req, res, next) {
            var data = {};

            ExternAccount.find(req.params.id, function(err, externAccount) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && req.permission.isPrivate() && externAccount && (externAccount.userId !== req.user.id)) {
                    err = new Error('Access forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!externAccount) {
                    err = new Error('ExternAccount not found');
                    err.status = 404;

                    return next(err);
                }

                data.externAccount = {
                    id: externAccount.id,
                    profiledId: externAccount.profileId,
                    username: externAccount.username,
                    displayName: externAccount.displayName,
                    email: externAccount.email,
                    user: externAccount.userId
                };

                return res.json(data);
            });
        });

        router.get('/externAccounts', function readExternAccounts(req, res, next) {
            var data = {};
            var err;

            if (req.query.ids) {
                var pending = req.query.ids.length;

                data.externAccount = [];

                var iterate = function(id) {
                    ExternAccount.find(id, function(err, externAccount) {
                        if (err) {
                            return next(err);
                        }

                        if (!req.user.admin && req.permission.isPrivate() && externAccount && (externAccount.userId !== req.user.id)) {
                            err = new Error('Access forbidden');
                            err.status = 403;

                            return next(err);
                        }

                        if (!externAccount) {
                            err = new Error('ExternAccount not found');
                            err.status = 404;

                            return next(err);
                        }

                        data.externAccount.push({
                            id: externAccount.id,
                            profiledId: externAccount.profileId,
                            username: externAccount.username,
                            displayName: externAccount.displayName,
                            email: externAccount.email,
                            user: externAccount.userId
                        });

                        if (!--pending) {
                            return res.json(data);
                        }
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

                ExternAccount.all({
                    where: filter,
                    order: order + ' ' + sort,
                    skip: offset,
                    limit: limit
                }, function(err, externAccounts) {
                    if (err) {
                        return next(err);
                    }

                    ExternAccount.count(function(err, count) {
                        if (err) {
                            return next(err);
                        }

                        if (offset > count) {
                            err = new Error('Invalid parameter');
                            err.status = 422;

                            return next(err);
                        }

                        data.externAccount = [];

                        data.meta = {
                            total: count
                        };

                        if (!externAccounts) {
                            return res.json(data);
                        }

                        var pending = externAccounts.length;

                        var iterate = function(externAccount) {
                            if (!req.user.admin && req.permission.isPrivate() && (externAccount.userId !== req.user.id)) {
                                err = new Error('Access forbidden');
                                err.status = 403;

                                return next(err);
                            }

                            data.key.push({
                                id: externAccount.id,
                                profiledId: externAccount.profileId,
                                username: externAccount.username,
                                displayName: externAccount.displayName,
                                email: externAccount.email,
                                user: externAccount.userId
                            });

                            if (!--pending) {
                                return res.json(data);
                            }
                        };

                        for (var i = 0; i < externAccounts.length; i++) {
                            iterate(externAccounts[i]);
                        }
                    });
                });
            }
        });

        router.put('/externAccounts/:id', function updateExternAccount(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            ExternAccount.find(req.params.id, function(err, externAccount) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && externAccount && (externAccount.userId !== req.user.id)) {
                    err = new Error('Access forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!externAccount) {
                    err = new Error('Key not found');
                    err.status = 404;

                    return next(err);
                }

                externAccount.updateAttributes(req.body.externAccount, function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.send(200);
                });
            });
        });

        router.delete('/externAccounts/:id', function deleteExternAccount(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            ExternAccount.find(req.params.id, function(err, externAccount) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && externAccount && (externAccount.userId !== req.user.id)) {
                    err = new Error('Access forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!externAccount) {
                    err = new Error('ExternAccount not found');
                    err.status = 404;

                    return next(err);
                }

                externAccount.destroy(function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.send(200);
                });
            });
        });
    };
}());