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

        var Category = schema.loadDefinition('Category');

        router.post('/categories', function createCategory(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            var category = new Category(req.body.category);

            if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && category.userId && (category.userId !== req.user.id)) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            category.save(function(err) {
                if (err) {
                    return next(err);
                }

                return res.send(200);
            });
        });

        router.get('/categories/:id', function readCategory(req, res, next) {
            var data = {};

            Category.find(req.params.id, function(err, category) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && req.permission.isPrivate() && category && category.userId && (category.userId !== req.user.id)) {
                    err = new Error('Forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!category) {
                    err = new Error('Not Found');
                    err.status = 404;

                    return next(err);
                }

                data.category = {
                    id: category.id,
                    name: category.name,
                };

                return res.json(data);
            });
        });

        router.get('/categories', function readCategories(req, res, next) {
            var data = {};
            var err;

            if (req.query.ids) {
                var pending = req.query.ids.length;

                data.category = [];

                var iterate = function(id) {
                    Category.find(id, function(err, category) {
                        if (err) {
                            return next(err);
                        }

                        if (!req.user.admin && req.permission.isPrivate() && category && category.userId && (category.userId !== req.user.id)) {
                            err = new Error('Forbidden');
                            err.status = 403;

                            return next(err);
                        }

                        if (!category) {
                            err = new Error('Not Found');
                            err.status = 404;

                            return next(err);
                        }

                        data.category.push({
                            id: category.id,
                            name: category.name,
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

                Category.count(filter, function(err, count) {
                    if (err) {
                        return next(err);
                    }

                    data.category = [];
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

                    Category.all({
                        where: filter,
                        order: order + ' ' + sort,
                        skip: offset,
                        limit: limit
                    }, function(err, categories) {
                        if (err) {
                            return next(err);
                        }

                        if (!categories.length) {
                            return res.json(data);
                        }

                        var pending = categories.length;

                        var iterate = function(category) {
                            if (!req.user.admin && req.permission.isPrivate() && category.userId && (category.userId !== req.user.id)) {
                                err = new Error('Forbidden');
                                err.status = 403;

                                return next(err);
                            }

                            data.category.push({
                                id: category.id,
                                name: category.name
                            });

                            if (!--pending) {
                                return res.json(data);
                            }
                        };

                        for (var i = 0; i < categories.length; i++) {
                            iterate(categories[i]);
                        }
                    });
                });
            }
        });

        router.put('/categories/:id', function updateCategory(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            Category.find(req.params.id, function(err, category) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && category && (category.userId !== req.user.id)) {
                    err = new Error('Forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!category) {
                    err = new Error('Not Found');
                    err.status = 404;

                    return next(err);
                }

                category.updateAttributes(req.body.category, function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.send(200);
                });
            });
        });

        router.delete('/categories/:id', function deleteCategory(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            Category.find(req.params.id, function(err, category) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && category && category.userId && (category.userId !== req.user.id)) {
                    err = new Error('Forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!category) {
                    err = new Error('Not Found');
                    err.status = 404;

                    return next(err);
                }

                category.destroy(function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.send(200);
                });
            });
        });
    };
}());