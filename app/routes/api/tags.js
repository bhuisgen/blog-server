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
        var Tag = schema.loadDefinition('Tag');

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
                    if (req.role.tagsCreate) {
                        allow = true;
                    }
                    break;

                case 'GET':
                    if (req.role.tagsRead) {
                        allow = true;
                    }
                    break;

                case 'PUT':
                    if (req.role.tagsUpdate) {
                        allow = true;
                    }
                    break;

                case 'DELETE':
                    if (req.role.tagsDelete) {
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
                    name: 'Tags'
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

        router.post('/tags', function createTag(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            var tag = new Tag(req.body.tag);

            if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && tag.userId && (tag.userId !== req.user.id)) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            tag.save(function(err) {
                if (err) {
                    return next(err);
                }

                return res.send(200);
            });
        });

        router.get('/tags/:id', function readTag(req, res, next) {
            var data = {};

            Tag.find(req.params.id, function(err, tag) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && req.permission.isPrivate() && tag && tag.userId && (tag.userId !== req.user.id)) {
                    err = new Error('Access forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!tag) {
                    err = new Error('Tag not found');
                    err.status = 404;

                    return next(err);
                }

                data.tag = {
                    id: tag.id,
                    name: tag.name,
                };

                return res.json(data);
            });
        });

        router.get('/tags', function readTags(req, res, next) {
            var data = {};
            var err;

            if (req.query.ids) {
                var pending = req.query.ids.length;

                data.tag = [];

                var iterate = function(id) {
                    Tag.find(id, function(err, tag) {
                        if (err) {
                            return next(err);
                        }

                        if (!req.user.admin && req.permission.isPrivate() && tag && tag.userId && (tag.userId !== req.user.id)) {
                            err = new Error('Access forbidden');
                            err.status = 403;

                            return next(err);
                        }

                        if (!tag) {
                            err = new Error('Tag not found');
                            err.status = 404;

                            return next(err);
                        }

                        data.tag.push({
                            id: tag.id,
                            name: tag.name,
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

                Tag.all({
                    where: filter,
                    order: order + ' ' + sort,
                    skip: offset,
                    limit: limit
                }, function(err, tags) {
                    if (err) {
                        return next(err);
                    }

                    Tag.count(function(err, count) {
                        if (err) {
                            return next(err);
                        }

                        if (offset > count) {
                            err = new Error('Invalid parameter');
                            err.status = 422;

                            return next(err);
                        }

                        data.tag = [];

                        data.meta = {
                            total: count
                        };

                        if (!tags) {
                            return res.json(data);
                        }

                        var pending = tags.length;

                        var iterate = function(tag) {
                            if (!req.user.admin && req.permission.isPrivate() && tag.userId && (tag.userId !== req.user.id)) {
                                err = new Error('Access forbidden');
                                err.status = 403;

                                return next(err);
                            }

                            data.tag.push({
                                id: tag.id,
                                name: tag.name
                            });

                            if (!--pending) {
                                return res.json(data);
                            }
                        };

                        for (var i = 0; i < tags.length; i++) {
                            iterate(tags[i]);
                        }
                    });
                });
            }
        });

        router.put('/tags/:id', function updateTag(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            Tag.find(req.params.id, function(err, tag) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && tag && tag.userId && (tag.userId !== req.user.id)) {
                    err = new Error('Access forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!tag) {
                    err = new Error('Tag not found');
                    err.status = 404;

                    return next(err);
                }

                tag.updateAttributes(req.body.tag, function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.send(200);
                });
            });
        });

        router.delete('/tags/:id', function deleteTag(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            Tag.find(req.params.id, function(err, tag) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && tag && tag.userId && (tag.userId !== req.user.id)) {
                    err = new Error('Access forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!tag) {
                    err = new Error('Tag not found');
                    err.status = 404;

                    return next(err);
                }

                tag.destroy(function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.send(200);
                });
            });
        });
    };
}());