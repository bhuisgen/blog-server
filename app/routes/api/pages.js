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

        var Page = schema.loadDefinition('Page');

        router.post('/pages', function createPage(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            var page = new Page(req.body.page);

            if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && page.userId && (page.userId !== req.user.id)) {
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

                if (!req.user.admin && req.permission.isPrivate() && page && page.userId && (page.userId !== req.user.id)) {
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
                    updated: page.updated,
                    published: page.published,
                    views: page.views++,
                    user: page.userId
                };

                page.updateAttribute('views', page.views, function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.json(data);
                });
            });
        });

        router.get('/pages', function readPages(req, res, next) {
            var data = {};
            var err;

            if (req.query.ids) {
                var pending = req.query.ids.length;

                data.page = [];

                var iterate = function(id) {
                    Page.find(id, function(err, page) {
                        if (err) {
                            return next(err);
                        }

                        if (!req.user.admin && req.permission.isPrivate() && page && page.userId && (page.userId !== req.user.id)) {
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
                            updated: page.updated,
                            published: page.published,
                            views: page.views++,
                            user: page.userId
                        });

                        page.updateAttribute('views', page.views, function(err) {
                            if (err) {
                                return next(err);
                            }

                            if (!--pending) {
                                return res.json(data);
                            }
                        });
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

                if (req.query.updated) {
                    filter.updated = req.query.updated;
                }

                if (req.query.published) {
                    filter.published = req.query.published;
                }

                if (req.query.views) {
                    filter.views = req.query.views;
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

                Page.count(filter, function(err, count) {
                    if (err) {
                        return next(err);
                    }

                    data.page = [];
                    data.meta = {
                        count: count
                    };

                    if (!count) {
                        return res.json(data);
                    }

                    if (offset >= count) {
                        err = new Error('Invalid parameter');
                        err.status = 422;

                        return next(err);
                    }

                    Page.all({
                        where: filter,
                        order: order + ' ' + sort,
                        skip: offset,
                        limit: limit
                    }, function(err, pages) {
                        if (err) {
                            return next(err);
                        }

                        if (!pages.length) {
                            return res.json(data);
                        }

                        var pending = pages.length;

                        var iterate = function(page) {
                            if (!req.user.admin && req.permission.isPrivate() && page.userId && (page.userId !== req.user.id)) {
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
                                updated: page.updated,
                                published: page.published,
                                views: page.views++,
                                user: page.userId
                            });

                            page.updateAttribute('views', page.views, function(err) {
                                if (err) {
                                    return next(err);
                                }

                                if (!--pending) {
                                    return res.json(data);
                                }
                            });
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

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            Page.find(req.params.id, function(err, page) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && page && page.userId && (page.userId !== req.user.id)) {
                    err = new Error('Access forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!page) {
                    err = new Error('Page not found');
                    err.status = 404;

                    return next(err);
                }

                req.body.page.updated = new Date();

                page.updateAttributes(req.body.page, function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.send(200);
                });
            });
        });

        router.delete('/pages/:id', function deletePage(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            Page.find(req.params.id, function(err, page) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && page && page.userId && (page.userId !== req.user.id)) {
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