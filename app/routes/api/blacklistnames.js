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

        var BlacklistName = schema.loadDefinition('BlacklistName');

        router.post('/blacklistNames', function createBlacklistName(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            var blacklistName = new BlacklistName(req.body.blacklistName);

            if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && blacklistName.userId && (blacklistName.userId !== req.user.id)) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            blacklistName.save(function(err) {
                if (err) {
                    return next(err);
                }

                return res.send(200);
            });
        });

        router.get('/blacklistNames/:id', function readBlacklistName(req, res, next) {
            var data = {};

            BlacklistName.find(req.params.id, function(err, blacklistName) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && req.permission.isPrivate() && blacklistName && blacklistName.userId && (blacklistName.userId !== req.user.id)) {
                    err = new Error('Forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!blacklistName) {
                    err = new Error('Not Found');
                    err.status = 404;

                    return next(err);
                }

                data.blacklistName = {
                    id: blacklistName.id,
                    name: blacklistName.name
                };

                return res.json(data);
            });
        });

        router.get('/blacklistNames', function readBlacklistNames(req, res, next) {
            var data = {};
            var err;

            if (req.query.ids) {
                var pending = req.query.ids.length;

                data.blacklistName = [];

                var iterate = function(id) {
                    BlacklistName.find(id, function(err, blacklistName) {
                        if (err) {
                            return next(err);
                        }

                        if (!req.user.admin && req.permission.isPrivate() && blacklistName && blacklistName.userId && (blacklistName.userId !== req.user.id)) {
                            err = new Error('Forbidden');
                            err.status = 403;

                            return next(err);
                        }

                        if (!blacklistName) {
                            err = new Error('Not Found');
                            err.status = 404;

                            return next(err);
                        }

                        data.blacklistName.push({
                            id: blacklistName.id,
                            name: blacklistName.name
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
                    err = new Error('Bad Request');
                    err.status = 400;

                    return next(err);
                }

                BlacklistName.count(filter, function(err, count) {
                    if (err) {
                        return next(err);
                    }

                    data.blacklistName = [];
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

                    BlacklistName.all({
                        where: filter,
                        order: order + ' ' + sort,
                        skip: offset,
                        limit: limit
                    }, function(err, blacklistNames) {
                        if (err) {
                            return next(err);
                        }

                        if (!blacklistNames.length) {
                            return res.json(data);
                        }

                        var pending = blacklistNames.length;

                        var iterate = function(blacklistName) {
                            if (!req.user.admin && req.permission.isPrivate() && blacklistName.userId && (blacklistName.userId !== req.user.id)) {
                                err = new Error('Forbidden');
                                err.status = 403;

                                return next(err);
                            }

                            data.blacklistName.push({
                                id: blacklistName.id,
                                name: blacklistName.name
                            });

                            if (!--pending) {
                                return res.json(data);
                            }
                        };

                        for (var i = 0; i < blacklistNames.length; i++) {
                            iterate(blacklistNames[i]);
                        }
                    });
                });
            }
        });

        router.put('/blacklistNames/:id', function updateBlacklistName(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            BlacklistName.find(req.params.id, function(err, blacklistName) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && blacklistName && blacklistName.userId && (blacklistName.userId !== req.user.id)) {
                    err = new Error('Forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!blacklistName) {
                    err = new Error('Not Found');
                    err.status = 404;

                    return next(err);
                }

                blacklistName.updateAttributes(req.body.blacklistName, function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.send(200);
                });
            });
        });

        router.delete('/blacklistNames/:id', function deleteBlacklistName(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            BlacklistName.find(req.params.id, function(err, blacklistName) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && blacklistName && blacklistName.userId && (blacklistName.userId !== req.user.id)) {
                    err = new Error('Forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!blacklistName) {
                    err = new Error('Not Found');
                    err.status = 404;

                    return next(err);
                }

                blacklistName.destroy(function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.send(200);
                });
            });
        });
    };
}());