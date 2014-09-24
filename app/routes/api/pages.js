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
        var Page = schema.loadDefinition('Page');

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
                    if (req.role.pagesCreate) {
                        allow = true;
                    }
                    break;

                case 'GET':
                    if (req.role.pagesRead) {
                        allow = true;
                    }
                    break;

                case 'PUT':
                    if (req.role.pagesUpdate) {
                        allow = true;
                    }
                    break;

                case 'DELETE':
                    if (req.role.pagesDelete) {
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
                    name: 'Pages'
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

        router.post('/pages', function createPage(req, res, next) {
            var err;

            if (req.permission.isReadOnly()) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            var page = new Page(req.body.page);

            if ((req.permission.isShared() || req.permission.isPrivate()) && (page.userId !== req.user.id)) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            page.save(function(err) {
                if (err) {
                    return next(err);
                }

                return res.send(200);
            });
        });

        router.get('/pages/:id', function readPage(req, res, next) {
            var data = {};

            Page.find(req.params.id, function(err, page) {
                if (err) {
                    return next(err);
                }

                if (req.permission.isPrivate() && page && (page.userId !== req.user.id)) {
                    err = new Error('Access forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!page) {
                    err = new Error('Page not found');
                    err.status = 404;

                    return next(err);
                }

                data.page = {
                    id: page.id,
                    slug: page.slug,
                    layout: page.layout,
                    title: page.title,
                    image: page.image,
                    content: page.content,
                    created: page.created,
                    published: page.published,
                    user: page.userId
                };

                return res.json(data);
            });
        });

        router.get('/pages', function readPages(req, res, next) {
            var data = {};

            if (req.query.ids) {
                var pending = req.query.ids.length;

                data.page = [];

                var iterate = function(id) {
                    Page.find(id, function(err, page) {
                        if (err) {
                            return next(err);
                        }

                        if (req.permission.isPrivate() && page && (page.userId !== req.user.id)) {
                            err = new Error('Access forbidden');
                            err.status = 403;

                            return next(err);
                        }

                        if (!page) {
                            err = new Error('Page not found');
                            err.status = 404;

                            return next(err);
                        }

                        data.page.push({
                            id: page.id,
                            slug: page.slug,
                            layout: page.layout,
                            title: page.title,
                            image: page.image,
                            content: page.content,
                            created: page.created,
                            published: page.published,
                            user: page.userId
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

                if (req.query.slug) {
                    filter.slug = req.query.slug;
                }

                if (req.query.created) {
                    filter.created = req.query.created;
                }

                if (req.query.published) {
                    filter.published = req.query.published;
                }

                if (Object.keys(filter).length === 0) {
                    filter = null;
                }

                var order = req.query.order || 'id';
                var sort = (req.query.sort === 'false' ? 'DESC' : 'ASC');
                var offset = parseInt(req.query.offset, 10) || 0;
                var limit = parseInt(req.query.limit, 10) || config.server.api.maxItems;

                Page.all({
                    where: filter,
                    order: order + ' ' + sort,
                    skip: offset,
                    limit: limit
                }, function(err, pages) {
                    if (err) {
                        return next(err);
                    }

                    Page.count(function(err, count) {
                        if (err) {
                            return next(err);
                        }

                        data.page = [];

                        data.meta = {
                            total: count
                        };

                        if (!pages) {
                            return res.json(data);
                        }

                        var pending = pages.length;

                        var iterate = function(page) {
                            if (req.permission.isPrivate() && (page.userId !== req.user.id)) {
                                err = new Error('Access forbidden');
                                err.status = 403;

                                return next(err);
                            }

                            data.page.push({
                                id: page.id,
                                slug: page.slug,
                                layout: page.layout,
                                title: page.title,
                                image: page.image,
                                content: page.content,
                                created: page.created,
                                published: page.published,
                                user: page.userId
                            });

                            if (!--pending) {
                                return res.json(data);
                            }
                        };

                        for (var i = 0; i < pages.length; i++) {
                            iterate(pages[i]);
                        }
                    });
                });
            }
        });

        router.put('/pages/:id', function updatePage(req, res, next) {
            var err;

            if (req.permission.isReadOnly()) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            Page.find(req.params.id, function(err, page) {
                if (err) {
                    return next(err);
                }

                if ((req.permission.isShared() || req.permission.isPrivate()) && page && (page.userId !== req.user.id)) {
                    err = new Error('Access forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!page) {
                    err = new Error('Page not found');
                    err.status = 404;

                    return next(err);
                }

                page.update(req.body.page, function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.send(200);
                });
            });
        });

        router.delete('/pages/:id', function deletePage(req, res, next) {
            var err;

            if (req.permission.isReadOnly()) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            Page.find(req.params.id, function(err, page) {
                if (err) {
                    return next(err);
                }

                if ((req.permission.isShared() || req.permission.isPrivate()) &&  page && (page.userId !== req.user.id)) {
                    err = new Error('Access forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!page) {
                    err = new Error('Page not found');
                    err.status = 404;

                    return next(err);
                }

                page.destroy(function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.send(200);
                });
            });
        });
    };
}());