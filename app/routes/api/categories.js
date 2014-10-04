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
        var Category = schema.loadDefinition('Category');

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
                    if (req.role.categoriesCreate) {
                        allow = true;
                    }
                    break;

                case 'GET':
                    if (req.role.categoriesRead) {
                        allow = true;
                    }
                    break;

                case 'PUT':
                    if (req.role.categoriesUpdate) {
                        allow = true;
                    }
                    break;

                case 'DELETE':
                    if (req.role.categoriesDelete) {
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
                    name: 'Categories'
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

        router.post('/categories', function createCategory(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            var category = new Category(req.body.category);

            if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && category.userId && (category.userId !== req.user.id)) {
                err = new Error('Access forbidden');
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
                    err = new Error('Access forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!category) {
                    err = new Error('Category not found');
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
                            err = new Error('Access forbidden');
                            err.status = 403;

                            return next(err);
                        }

                        if (!category) {
                            err = new Error('Category not found');
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

                Category.all({
                    where: filter,
                    order: order + ' ' + sort,
                    skip: offset,
                    limit: limit
                }, function(err, categories) {
                    if (err) {
                        return next(err);
                    }
                        
                    if (offset > categories.length) {
                        err = new Error('Invalid parameter');
                        err.status = 422;

                        return next(err);
                    }

                    data.category = [];
                    data.meta = {
                        count: categories.length
                    };

                    if (!categories.length) {
                        return res.json(data);
                    }

                    var pending = categories.length;

                    var iterate = function(category) {
                        if (!req.user.admin && req.permission.isPrivate() && category.userId && (category.userId !== req.user.id)) {
                            err = new Error('Access forbidden');
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
            }
        });

        router.put('/categories/:id', function updateCategory(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            Category.find(req.params.id, function(err, category) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && category && (category.userId !== req.user.id)) {
                    err = new Error('Access forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!category) {
                    err = new Error('Category not found');
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
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            Category.find(req.params.id, function(err, category) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && category && category.userId && (category.userId !== req.user.id)) {
                    err = new Error('Access forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!category) {
                    err = new Error('Category not found');
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