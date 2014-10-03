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
        var Key = schema.loadDefinition('Key');

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
                    if (req.role.keysCreate) {
                        allow = true;
                    }
                    break;

                case 'GET':
                    if (req.role.keysRead) {
                        allow = true;
                    }
                    break;

                case 'PUT':
                    if (req.role.keysUpdate) {
                        allow = true;
                    }
                    break;

                case 'DELETE':
                    if (req.role.keysDelete) {
                        allow = true;
                    }
                    break;
            }

            if (!allow) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            Collection.findOne({
                where: {
                    name: 'Keys'
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

        router.post('/keys', function createKey(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            var key = new Key(req.body.key);

            if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && (key.userId !== req.user.id)) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            key.save(function(err) {
                if (err) {
                    return next(err);
                }

                return res.send(200);
            });
        });

        router.get('/keys/:id', function readKey(req, res, next) {
            var data = {};

            Key.find(req.params.id, function(err, key) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && req.permission.isPrivate() && key && (key.userId !== req.user.id)) {
                    err = new Error('Access forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!key) {
                    err = new Error('Key not found');
                    err.status = 404;

                    return next(err);
                }

                data.key = {
                    id: key.id,
                    authkey: key.authkey,
                    created: key.created,
                    enabled: key.enabled,
                    user: key.userId
                };

                return res.json(data);
            });
        });

        router.get('/keys', function readKeys(req, res, next) {
            var data = {};
            var err;

            if (req.query.ids) {
                var pending = req.query.ids.length;

                data.key = [];

                var iterate = function(id) {
                    Key.find(id, function(err, key) {
                        if (err) {
                            return next(err);
                        }

                        if (!req.user.admin && req.permission.isPrivate() && key && (key.userId !== req.user.id)) {
                            err = new Error('Access forbidden');
                            err.status = 403;

                            return next(err);
                        }

                        if (!key) {
                            err = new Error('Key not found');
                            err.status = 404;

                            return next(err);
                        }

                        data.key.push({
                            id: key.id,
                            authkey: key.authkey,
                            created: key.created,
                            enabled: key.enabled,
                            user: key.userId
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

                Key.all({
                    where: filter,
                    order: order + ' ' + sort,
                    skip: offset,
                    limit: limit
                }, function(err, keys) {
                    if (err) {
                        return next(err);
                    }

                    Key.count(function(err, count) {
                        if (err) {
                            return next(err);
                        }

                        if (offset > count) {
                            err = new Error('Invalid parameter');
                            err.status = 422;

                            return next(err);
                        }

                        data.key = [];

                        data.meta = {
                            total: count
                        };

                        if (!keys.length) {
                            return res.json(data);
                        }

                        var pending = keys.length;

                        var iterate = function(key) {
                            if (!req.user.admin && req.permission.isPrivate() && (key.userId !== req.user.id)) {
                                err = new Error('Access forbidden');
                                err.status = 403;

                                return next(err);
                            }

                            data.key.push({
                                id: key.id,
                                authkey: key.authkey,
                                created: key.created,
                                enabled: key.enabled,
                                user: key.userId
                            });

                            if (!--pending) {
                                return res.json(data);
                            }
                        };

                        for (var i = 0; i < keys.length; i++) {
                            iterate(keys[i]);
                        }
                    });
                });
            }
        });

        router.put('/keys/:id', function updateKey(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            Key.find(req.params.id, function(err, key) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && key && (key.userId !== req.user.id)) {
                    err = new Error('Access forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!key) {
                    err = new Error('Key not found');
                    err.status = 404;

                    return next(err);
                }

                key.updateAttributes(req.body.key, function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.send(200);
                });
            });
        });

        router.delete('/keys/:id', function deleteKey(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            Key.find(req.params.id, function(err, key) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && key && (key.userId !== req.user.id)) {
                    err = new Error('Access forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!key) {
                    err = new Error('Key not found');
                    err.status = 404;

                    return next(err);
                }

                key.destroy(function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.send(200);
                });
            });
        });
    };
}());