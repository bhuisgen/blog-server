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

        var BlacklistIP = schema.loadDefinition('BlacklistIp');

        router.post('/blacklistIPs', function createBlacklistIP(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            var blacklistIP = new BlacklistIP(req.body.blacklistIP);

            if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && blacklistIP.userId && (blacklistIP.userId !== req.user.id)) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            blacklistIP.save(function(err) {
                if (err) {
                    return next(err);
                }

                return res.send(200);
            });
        });

        router.get('/blacklistIPs/:id', function readBlacklistIP(req, res, next) {
            var data = {};

            BlacklistIP.find(req.params.id, function(err, blacklistIP) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && req.permission.isPrivate() && blacklistIP && blacklistIP.userId && (blacklistIP.userId !== req.user.id)) {
                    err = new Error('Forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!blacklistIP) {
                    err = new Error('Not Found');
                    err.status = 404;

                    return next(err);
                }

                data.blacklistIP = {
                    id: blacklistIP.id,
                    ip: blacklistIP.ip
                };

                return res.json(data);
            });
        });

        router.get('/blacklistIPs', function readBlacklistIPs(req, res, next) {
            var data = {};
            var err;

            if (req.query.ids) {
                var pending = req.query.ids.length;

                data.blacklistIP = [];

                var iterate = function(id) {
                    BlacklistIP.find(id, function(err, blacklistIP) {
                        if (err) {
                            return next(err);
                        }

                        if (!req.user.admin && req.permission.isPrivate() && blacklistIP && blacklistIP.userId && (blacklistIP.userId !== req.user.id)) {
                            err = new Error('Forbidden');
                            err.status = 403;

                            return next(err);
                        }

                        if (!blacklistIP) {
                            err = new Error('Not Found');
                            err.status = 404;

                            return next(err);
                        }

                        data.blacklistIP.push({
                            id: blacklistIP.id,
                            ip: blacklistIP.ip
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

                if (req.query.ip) {
                    filter.ip = req.query.ip;
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

                BlacklistIP.count(filter, function(err, count) {
                    if (err) {
                        return next(err);
                    }

                    data.blacklistIP = [];
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

                    BlacklistIP.all({
                        where: filter,
                        order: order + ' ' + sort,
                        skip: offset,
                        limit: limit
                    }, function(err, blacklistIPs) {
                        if (err) {
                            return next(err);
                        }

                        if (!blacklistIPs.length) {
                            return res.json(data);
                        }

                        var pending = blacklistIPs.length;

                        var iterate = function(blacklistIP) {
                            if (!req.user.admin && req.permission.isPrivate() && blacklistIP.userId && (blacklistIP.userId !== req.user.id)) {
                                err = new Error('Forbidden');
                                err.status = 403;

                                return next(err);
                            }

                            data.blacklistIP.push({
                                id: blacklistIP.id,
                                ip: blacklistIP.ip
                            });

                            if (!--pending) {
                                return res.json(data);
                            }
                        };

                        for (var i = 0; i < blacklistIPs.length; i++) {
                            iterate(blacklistIPs[i]);
                        }
                    });
                });
            }
        });

        router.put('/blacklistIPs/:id', function updateBlacklistIP(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            BlacklistIP.find(req.params.id, function(err, blacklistIP) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && blacklistIP && blacklistIP.userId && (blacklistIP.userId !== req.user.id)) {
                    err = new Error('Forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!blacklistIP) {
                    err = new Error('Not Found');
                    err.status = 404;

                    return next(err);
                }

                blacklistIP.updateAttributes(req.body.blacklistIP, function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.send(200);
                });
            });
        });

        router.delete('/blacklistIPs/:id', function deleteBlacklistIP(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            BlacklistIP.find(req.params.id, function(err, blacklistIP) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && blacklistIP && blacklistIP.userId && (blacklistIP.userId !== req.user.id)) {
                    err = new Error('Forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!blacklistIP) {
                    err = new Error('Not Found');
                    err.status = 404;

                    return next(err);
                }

                blacklistIP.destroy(function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.send(200);
                });
            });
        });
    };
}());