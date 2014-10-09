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

        var BlacklistEmail = schema.loadDefinition('BlacklistEmail');

        router.post('/blacklistEmails', function createBlacklistEmail(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            var blacklistEmail = new BlacklistEmail(req.body.blacklistEmail);

            if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && blacklistEmail.userId && (blacklistEmail.userId !== req.user.id)) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            blacklistEmail.save(function(err) {
                if (err) {
                    return next(err);
                }

                return res.send(200);
            });
        });

        router.get('/blacklistEmails/:id', function readBlacklistEmail(req, res, next) {
            var data = {};

            BlacklistEmail.find(req.params.id, function(err, blacklistEmail) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && req.permission.isPrivate() && blacklistEmail && blacklistEmail.userId && (blacklistEmail.userId !== req.user.id)) {
                    err = new Error('Forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!blacklistEmail) {
                    err = new Error('Not Found');
                    err.status = 404;

                    return next(err);
                }

                data.blacklistEmail = {
                    id: blacklistEmail.id,
                    email: blacklistEmail.email
                };

                return res.json(data);
            });
        });

        router.get('/blacklistEmails', function readBlacklistEmails(req, res, next) {
            var data = {};
            var err;

            if (req.query.ids) {
                var pending = req.query.ids.length;

                data.blacklistEmail = [];

                var iterate = function(id) {
                    BlacklistEmail.find(id, function(err, blacklistEmail) {
                        if (err) {
                            return next(err);
                        }

                        if (!req.user.admin && req.permission.isPrivate() && blacklistEmail && blacklistEmail.userId && (blacklistEmail.userId !== req.user.id)) {
                            err = new Error('Forbidden');
                            err.status = 403;

                            return next(err);
                        }

                        if (!blacklistEmail) {
                            err = new Error('Not Found');
                            err.status = 404;

                            return next(err);
                        }

                        data.blacklistEmail.push({
                            id: blacklistEmail.id,
                            email: blacklistEmail.name
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

                if (req.query.email) {
                    filter.email = req.query.email;
                }

                if (Object.keys(filter).length === 0) {
                    filter = null;
                }

                var order = req.query.order || 'id';
                var sort = (req.query.sort === 'false' ? 'DESC' : 'ASC');
                var offset = parseInt(req.query.offset, 10) || 0;
                var limit = parseInt(req.query.limit, 10) || config.server.api.maxItems;
                if ((offset < 0) || (limit < 0)) {
                    err = new Error('Bad Request');
                    err.status = 400;

                    return next(err);
                }

                BlacklistEmail.count(filter, function(err, count) {
                    if (err) {
                        return next(err);
                    }

                    data.blacklistEmail = [];
                    data.meta = {
                        count: count
                    };

                    if (!count) {
                        return res.json(data);
                    }

                    if (offset >= count) {
                        err = new Error('Bad Request');
                        err.status = 400;

                        return next(err);
                    }

                    BlacklistEmail.all({
                        where: filter,
                        order: order + ' ' + sort,
                        skip: offset,
                        limit: limit
                    }, function(err, blacklistEmails) {
                        if (err) {
                            return next(err);
                        }

                        if (!blacklistEmails.length) {
                            return res.json(data);
                        }

                        var pending = blacklistEmails.length;

                        var iterate = function(blacklistEmail) {
                            if (!req.user.admin && req.permission.isPrivate() && blacklistEmail.userId && (blacklistEmail.userId !== req.user.id)) {
                                err = new Error('Forbidden');
                                err.status = 403;

                                return next(err);
                            }

                            data.blacklistEmail.push({
                                id: blacklistEmail.id,
                                email: blacklistEmail.email
                            });

                            if (!--pending) {
                                return res.json(data);
                            }
                        };

                        for (var i = 0; i < blacklistEmails.length; i++) {
                            iterate(blacklistEmails[i]);
                        }
                    });
                });
            }
        });

        router.put('/blacklistEmails/:id', function updateBlacklistEmail(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            BlacklistEmail.find(req.params.id, function(err, blacklistEmail) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && blacklistEmail && blacklistEmail.userId && (blacklistEmail.userId !== req.user.id)) {
                    err = new Error('Forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!blacklistEmail) {
                    err = new Error('Not Found');
                    err.status = 404;

                    return next(err);
                }

                blacklistEmail.updateAttributes(req.body.blacklistEmail, function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.send(200);
                });
            });
        });

        router.delete('/blacklistEmails/:id', function deleteBlacklistEmail(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            BlacklistEmail.find(req.params.id, function(err, blacklistEmail) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && blacklistEmail && blacklistEmail.userId && (blacklistEmail.userId !== req.user.id)) {
                    err = new Error('Forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!blacklistEmail) {
                    err = new Error('Not Found');
                    err.status = 404;

                    return next(err);
                }

                blacklistEmail.destroy(function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.send(200);
                });
            });
        });
    };
}());