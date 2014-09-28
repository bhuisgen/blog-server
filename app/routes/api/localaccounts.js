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
        var LocalAccount = schema.loadDefinition('LocalAccount');

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
                    if (req.role.localAccountsCreate) {
                        allow = true;
                    }
                    break;

                case 'GET':
                    if (req.role.localAccountsRead) {
                        allow = true;
                    }
                    break;

                case 'PUT':
                    if (req.role.localAccountsUpdate) {
                        allow = true;
                    }
                    break;

                case 'DELETE':
                    if (req.role.localAccountsDelete) {
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
                    name: 'LocalAccounts'
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

        router.post('/localAccounts', function createLocalAccount(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            var localAccount = new LocalAccount(req.body.localAccount);

            if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && (localAccount.userId !== req.user.id)) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            localAccount.save(function(err) {
                if (err) {
                    return next(err);
                }

                return res.send(200);
            });
        });

        router.get('/localAccounts/:id', function readLocalAccount(req, res, next) {
            var data = {};

            LocalAccount.find(req.params.id, function(err, localAccount) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && req.permission.isPrivate() && localAccount && (localAccount.userId !== req.user.id)) {
                    err = new Error('Access forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!localAccount) {
                    err = new Error('LocalAccount not found');
                    err.status = 404;

                    return next(err);
                }

                data.localAccount = {
                    id: localAccount.id,
                    login: localAccount.login,
                    user: localAccount.userId
                };

                return res.json(data);
            });
        });

        router.get('/localAccounts', function readLocalAccounts(req, res, next) {
            var data = {};

            if (req.query.ids) {
                var pending = req.query.ids.length;

                data.localAccount = [];

                var iterate = function(id) {
                    LocalAccount.find(id, function(err, localAccount) {
                        if (err) {
                            return next(err);
                        }

                        if (!req.user.admin && req.permission.isPrivate() && localAccount && (localAccount.userId !== req.user.id)) {
                            err = new Error('Access forbidden');
                            err.status = 403;

                            return next(err);
                        }

                        if (!localAccount) {
                            err = new Error('LocalAccount not found');
                            err.status = 404;

                            return next(err);
                        }

                        data.localAccount.push({
                            id: localAccount.id,
                            login: localAccount.login,
                            user: localAccount.userId
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

                if (req.query.login) {
                    filter.login = req.query.login;
                }

                if (Object.keys(filter).length === 0) {
                    filter = null;
                }

                var order = req.query.order || 'id';
                var sort = (req.query.sort === 'false' ? 'DESC' : 'ASC');
                var offset = parseInt(req.query.offset, 10) || 0;
                var limit = parseInt(req.query.limit, 10) || config.server.api.maxItems;

                LocalAccount.all({
                    where: filter,
                    order: order + ' ' + sort,
                    skip: offset,
                    limit: limit
                }, function(err, localAccounts) {
                    if (err) {
                        return next(err);
                    }

                    LocalAccount.count(function(err, count) {
                        if (err) {
                            return next(err);
                        }

                        data.localAccount = [];

                        data.meta = {
                            total: count
                        };

                        if (!localAccounts) {
                            return res.json(data);
                        }

                        var pending = localAccounts.length;

                        var iterate = function(localAccount) {
                            if (!req.user.admin && req.permission.isPrivate() && (localAccount.userId !== req.user.id)) {
                                err = new Error('Access forbidden');
                                err.status = 403;

                                return next(err);
                            }

                            data.key.push({
                                id: localAccount.id,
                                login: localAccount.login,
                                user: localAccount.userId
                            });

                            if (!--pending) {
                                return res.json(data);
                            }
                        };

                        for (var i = 0; i < localAccounts.length; i++) {
                            iterate(localAccounts[i]);
                        }
                    });
                });
            }
        });

        router.put('/localAccounts/:id', function updateLocalAccount(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            LocalAccount.find(req.params.id, function(err, localAccount) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && localAccount && (localAccount.userId !== req.user.id)) {
                    err = new Error('Access forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!localAccount) {
                    err = new Error('Key not found');
                    err.status = 404;

                    return next(err);
                }

                localAccount.update(req.body.localAccount, function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.send(200);
                });
            });
        });

        router.delete('/localAccounts/:id', function deleteLocalAccount(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            LocalAccount.find(req.params.id, function(err, localAccount) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && localAccount && (localAccount.userId !== req.user.id)) {
                    err = new Error('Access forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!localAccount) {
                    err = new Error('LocalAccount not found');
                    err.status = 404;

                    return next(err);
                }

                localAccount.destroy(function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.send(200);
                });
            });
        });
    };
}());