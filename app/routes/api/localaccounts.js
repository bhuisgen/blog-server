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

        var LocalAccount = schema.loadDefinition('LocalAccount');

        router.post('/localAccounts', function createLocalAccount(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            var localAccount = new LocalAccount(req.body.localAccount);

            if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && (localAccount.userId !== req.user.id)) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            localAccount.save(function(err) {
                if (err) {
                    return next(err);
                }

                return res.send(200).end();
            });
        });

        router.get('/localAccounts/:id', function readLocalAccount(req, res, next) {
            var data = {};

            LocalAccount.find(req.params.id, function(err, localAccount) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && req.permission.isPrivate() && localAccount && (localAccount.userId !== req.user.id)) {
                    err = new Error('Forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!localAccount) {
                    err = new Error('Not Found');
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
            var err;

            if (req.query.ids) {
                var pending = req.query.ids.length;

                data.localAccount = [];

                var iterate = function(id) {
                    LocalAccount.find(id, function(err, localAccount) {
                        if (err) {
                            return next(err);
                        }

                        if (!req.user.admin && req.permission.isPrivate() && localAccount && (localAccount.userId !== req.user.id)) {
                            err = new Error('Forbidden');
                            err.status = 403;

                            return next(err);
                        }

                        if (!localAccount) {
                            err = new Error('Not Found');
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
                var sort = req.query.sort || 'ASC';
                var offset = parseInt(req.query.offset, 10) || 0;
                var limit = parseInt(req.query.limit, 10) || config.server.api.maxItems;
                if ((offset < 0) || (limit < 0)) {
                    err = new Error('Bad Request');
                    err.status = 400;

                    return next(err);
                }

                LocalAccount.count(filter, function(err, count) {
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

                    LocalAccount.all({
                        where: filter,
                        order: order + ' ' + sort,
                        skip: offset,
                        limit: limit
                    }, function(err, localAccounts) {
                        if (err) {
                            return next(err);
                        }

                        if (!localAccounts.length) {
                            err = new Error('Not Found');
                            err.status = 404;

                            return next(err);
                        }

                        data.localAccount = [];
                        data.meta = {
                            count: count
                        };

                        var pending = localAccounts.length;

                        var iterate = function(localAccount) {
                            if (!req.user.admin && req.permission.isPrivate() && (localAccount.userId !== req.user.id)) {
                                err = new Error('Forbidden');
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
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            LocalAccount.find(req.params.id, function(err, localAccount) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && localAccount && (localAccount.userId !== req.user.id)) {
                    err = new Error('Forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!localAccount) {
                    err = new Error('Not Found');
                    err.status = 404;

                    return next(err);
                }

                localAccount.updateAttributes(req.body.localAccount, function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.send(200).end();
                });
            });
        });

        router.delete('/localAccounts/:id', function deleteLocalAccount(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            LocalAccount.find(req.params.id, function(err, localAccount) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && localAccount && (localAccount.userId !== req.user.id)) {
                    err = new Error('Forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!localAccount) {
                    err = new Error('Not Found');
                    err.status = 404;

                    return next(err);
                }

                localAccount.destroy(function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.send(200).end();
                });
            });
        });
    };
}());