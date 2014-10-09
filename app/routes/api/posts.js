(function() {
    'use strict';

    var path = require('path');
    var _ = require('lodash');
    var async = require('async');

    var Schema = require('jugglingdb-model-loader');

    module.exports = function(config, router) {
        var options = config.database.options;

        options.modelLoader = {
            rootDirectory: path.normalize(__dirname + '/../../..'),
            directory: 'app/models'
        };

        var schema = new Schema(config.database.type, options);

        var Post = schema.loadDefinition('Post');

        router.post('/posts', function createPost(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            var post = new Post(req.body.post);

            if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && post.userId && (post.userId !== req.user.id)) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            post.save(function(err) {
                if (err) {
                    return next(err);
                }

                return res.send(200);
            });
        });

        router.get('/posts/:id', function readPost(req, res, next) {
            var data = {};

            Post.find(req.params.id, function(err, post) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin &&
                    (req.permission.isPrivate() && post && post.userId && (post.userId !== req.user.id)) ||
                    (!req.role.postsReadNotPublished && post && !post.published)) {
                    err = new Error('Forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!post) {
                    err = new Error('Not Found');
                    err.status = 404;

                    return next(err);
                }

                var comments;
                var categories;
                var tags;

                async.series([

                    function(callback) {
                        post.comments(function(err, objects) {
                            if (err) {
                                return callback(err);
                            }

                            comments = objects;

                            return callback(null);
                        });
                    },
                    function(callback) {
                        post.categories(function(err, objects) {
                            if (err) {
                                return callback(err);
                            }

                            categories = objects;

                            return callback(null);
                        });
                    },
                    function(callback) {
                        post.tags(function(err, objects) {
                            if (err) {
                                return callback(err);
                            }

                            tags = objects;

                            return callback(null);
                        });
                    }
                ], function(err) {
                    if (err) {
                        return next(err);
                    }

                    data.post = {
                        id: post.id,
                        slug: post.slug,
                        layout: post.layout,
                        title: post.title,
                        image: post.image,
                        content: post.content,
                        excerpt: post.excerpt,
                        created: post.created,
                        updated: post.updated,
                        published: post.published,
                        commentsEnabled: post.commentsEnabled,
                        commentsAllowed: post.commentsAllowed,
                        views: post.views++,
                        user: post.userId,
                        comments: _.pluck(comments, 'id'),
                        categories: _.pluck(categories, 'id'),
                        tags: _.pluck(tags, 'id')
                    };

                    post.updateAttribute('views', post.views, function(err) {
                        if (err) {
                            return next(err);
                        }

                        return res.json(data);
                    });
                });
            });
        });

        router.get('/posts', function readPosts(req, res, next) {
            var data = {};
            var err;

            if (req.query.ids) {
                var pending = req.query.ids.length;

                data.post = [];

                var iterate = function(id) {
                    Post.find(id, function(err, post) {
                        if (err) {
                            return next(err);
                        }

                        if (!req.user.admin &&
                            (req.permission.isPrivate() && post && post.userId && (post.userId !== req.user.id)) ||
                            (!req.role.postsReadNotPublished && post && !post.published)) {
                            err = new Error('Forbidden');
                            err.status = 403;

                            return next(err);
                        }

                        if (!post) {
                            err = new Error('Not Found');
                            err.status = 404;

                            return next(err);
                        }

                        var comments;
                        var categories;
                        var tags;

                        async.series([

                            function(callback) {
                                post.comments(function(err, objects) {
                                    if (err) {
                                        return callback(err);
                                    }

                                    comments = objects;

                                    return callback(null);
                                });
                            },
                            function(callback) {
                                post.categories(function(err, objects) {
                                    if (err) {
                                        return callback(err);
                                    }

                                    categories = objects;

                                    return callback(null);
                                });
                            },
                            function(callback) {
                                post.tags(function(err, objects) {
                                    if (err) {
                                        return callback(err);
                                    }

                                    tags = objects;

                                    return callback(null);
                                });
                            }
                        ], function(err) {
                            if (err) {
                                return next(err);
                            }

                            data.post.push({
                                id: post.id,
                                slug: post.slug,
                                layout: post.layout,
                                title: post.title,
                                image: post.image,
                                content: post.content,
                                excerpt: post.excerpt,
                                created: post.created,
                                updated: post.updated,
                                published: post.published,
                                commentsEnabled: post.commentsEnabled,
                                commentsAllowed: post.commentsAllowed,
                                views: post.views++,
                                user: post.userId,
                                comments: _.pluck(comments, 'id'),
                                categories: _.pluck(categories, 'id'),
                                tags: _.pluck(tags, 'id')
                            });

                            post.updateAttribute('views', post.views, function(err) {
                                if (err) {
                                    return next(err);
                                }

                                if (!--pending) {
                                    return res.json(data);
                                }
                            });
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

                if (req.query.published) {
                    filter.published = req.query.published;
                }

                if (req.query.views) {
                    filter.views = req.query.views;
                }

                if (!req.user.admin && req.permission.isPrivate()) {
                    filter.userId = req.user.id;
                }

                if (!req.user.admin && !req.role.postsReadNotPublished) {
                    filter.published = true;
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

                Post.count(filter, function(err, count) {
                    if (err) {
                        return next(err);
                    }

                    data.post = [];
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

                    Post.all({
                        where: filter,
                        order: order + ' ' + sort,
                        skip: offset,
                        limit: limit
                    }, function(err, posts) {
                        if (err) {
                            return next(err);
                        }

                        if (!posts.length) {
                            return res.json(data);
                        }

                        var pending = posts.length;

                        var iterate = function(post) {
                            var comments;
                            var categories;
                            var tags;

                            async.series([

                                function(callback) {
                                    post.comments(function(err, objects) {
                                        if (err) {
                                            return callback(err);
                                        }

                                        comments = objects;

                                        return callback(null);
                                    });
                                },
                                function(callback) {
                                    post.categories(function(err, objects) {
                                        if (err) {
                                            return callback(err);
                                        }

                                        categories = objects;

                                        return callback(null);
                                    });
                                },
                                function(callback) {
                                    post.tags(function(err, objects) {
                                        if (err) {
                                            return callback(err);
                                        }

                                        tags = objects;

                                        return callback(null);
                                    });
                                }
                            ], function(err, results) {
                                if (err) {
                                    return next(err);
                                }

                                data.post.push({
                                    id: post.id,
                                    slug: post.slug,
                                    layout: post.layout,
                                    title: post.title,
                                    image: post.image,
                                    content: post.content,
                                    excerpt: post.excerpt,
                                    created: post.created,
                                    updated: post.updated,
                                    published: post.published,
                                    commentsEnabled: post.commentsEnabled,
                                    commentsAllowed: post.commentsAllowed,
                                    views: post.views++,
                                    user: post.userId,
                                    comments: _.pluck(comments, 'id'),
                                    categories: _.pluck(categories, 'id'),
                                    tags: _.pluck(tags, 'id')
                                });

                                post.updateAttribute('views', post.views, function(err) {
                                    if (err) {
                                        return next(err);
                                    }

                                    if (!--pending) {
                                        return res.json(data);
                                    }
                                });
                            });
                        };

                        for (var i = 0; i < posts.length; i++) {
                            iterate(posts[i]);
                        }
                    });
                });
            }
        });

        router.put('/posts/:id', function updatePost(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            Post.find(req.params.id, function(err, post) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && post && post.userId && (post.userId !== req.user.id)) {
                    err = new Error('Forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!post) {
                    err = new Error('Not Found');
                    err.status = 400;

                    return next(err);
                }

                req.body.post.updated = new Date();

                post.updateAttributes(req.body.post, function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.send(200);
                });
            });
        });

        router.delete('/posts/:id', function deletePost(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
            }

            Post.find(req.params.id, function(err, post) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && post && post.userId && (post.userId !== req.user.id)) {
                    err = new Error('Forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!post) {
                    err = new Error('Not Found');
                    err.status = 400;

                    return next(err);
                }

                post.destroy(function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.send(200);
                });
            });
        });
    };
}());