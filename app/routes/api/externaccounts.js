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

        var ExternAccount = schema.loadDefinition('ExternAccount');

        router.post('/externAccounts', function createExternAccount(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            var externAccount = new ExternAccount(req.body.externAccount);

            if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && (externAccount.userId !== req.user.id)) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            externAccount.save(function(err) {
                if (err) {
                    return next(err);
                }

                return res.send(200).end();
            });
        });

        router.get('/externAccounts/:id', function readExternAccount(req, res, next) {
            var data = {};

            ExternAccount.find(req.params.id, function(err, externAccount) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && req.permission.isPrivate() && externAccount && (externAccount.userId !== req.user.id)) {
                    err = new Error('Forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!externAccount) {
                    err = new Error('Not Found');
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
                            err = new Error('Forbidden');
                            err.status = 403;

                            return next(err);
                        }

                        if (!externAccount) {
                            err = new Error('Not Found');
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
                var sort = req.query.sort || 'ASC';
                var offset = parseInt(req.query.offset, 10) || 0;
                var limit = parseInt(req.query.limit, 10) || config.server.api.maxItems;
                if ((offset < 0) || (limit < 0)) {
                    err = new Error('Bad Request');
                    err.status = 400;

                    return next(err);
                }

                ExternAccount.count(filter, function(err, count) {
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

                    ExternAccount.all({
                        where: filter,
                        order: order + ' ' + sort,
                        skip: offset,
                        limit: limit
                    }, function(err, externAccounts) {
                        if (err) {
                            return next(err);
                        }

                        if (!externAccounts.length) {
                            err = new Error('Not Found');
                            err.status = 404;

                            return next(err);
                        }

                        data.externAccount = [];
                        data.meta = {
                            count: count
                        };

                        var pending = externAccounts.length;

                        var iterate = function(externAccount) {
                            if (!req.user.admin && req.permission.isPrivate() && (externAccount.userId !== req.user.id)) {
                                err = new Error('Forbidden');
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
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            ExternAccount.find(req.params.id, function(err, externAccount) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && externAccount && (externAccount.userId !== req.user.id)) {
                    err = new Error('Forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!externAccount) {
                    err = new Error('Not Found');
                    err.status = 404;

                    return next(err);
                }

                externAccount.updateAttributes(req.body.externAccount, function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.send(200).end();
                });
            });
        });

        router.delete('/externAccounts/:id', function deleteExternAccount(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            ExternAccount.find(req.params.id, function(err, externAccount) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && externAccount && (externAccount.userId !== req.user.id)) {
                    err = new Error('Forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!externAccount) {
                    err = new Error('Not Found');
                    err.status = 404;

                    return next(err);
                }

                externAccount.destroy(function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.send(200).end();
                });
            });
        });
    };
}());