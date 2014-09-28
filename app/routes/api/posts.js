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

        var Collection = schema.loadDefinition('Collection');
        var Post = schema.loadDefinition('Post');

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
                    if (req.role.postsCreate) {
                        allow = true;
                    }
                    break;

                case 'GET':
                    if (req.role.postsRead) {
                        allow = true;
                    }
                    break;

                case 'PUT':
                    if (req.role.postsUpdate) {
                        allow = true;
                    }
                    break;

                case 'DELETE':
                    if (req.role.postsDelete) {
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
                    name: 'Posts'
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

        router.post('/posts', function createPost(req, res, next) {
            var err;

            if (!req.user.admin && req.permission.isReadOnly()) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            var post = new Post(req.body.post);

            if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && (post.userId !== req.user.id)) {
                err = new Error('Access forbidden');
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

                if (!req.user.admin && req.permission.isPrivate() && post && (post.userId !== req.user.id)) {
                    err = new Error('Access forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!post) {
                    err = new Error('Post not found');
                    err.status = 404;

                    return next(err);
                }

                async.series([

                    function(callback) {
                        post.comments(function(err, comments) {
                            if (err) {
                                return callback(err);
                            }

                            if (!comments) {
                                comments = {};
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
                                published: post.published,
                                commentsEnabled: post.commentsEnabled,
                                commentsAllowed: post.commentsAllowed,
                                user: post.userId,
                                comments: _.pluck(comments, 'id')
                            };

                            return callback(null);
                        });
                    },
                    function(callback) {
                        post.categories(function(err, categories) {
                            if (err) {
                                return callback(err);
                            }

                            if (categories) {
                                data.post.categories = _.pluck(categories, 'name');
                            }

                            return callback(null);
                        });
                    },
                    function(callback) {
                        post.tags(function(err, tags) {
                            if (err) {
                                return callback(err);
                            }

                            if (tags) {
                                data.post.tags = _.pluck(tags, 'name');
                            }

                            return callback(null);
                        });
                    }
                ], function(err, results) {
                    if (err) {
                        return next(err);
                    }

                    return res.json(data);
                });
            });
        });

        router.get('/posts', function readPosts(req, res, next) {
            var data = {};

            if (req.query.ids) {
                var pending = req.query.ids.length;

                data.post = [];

                var iterate = function(id) {
                    Post.find(id, function(err, post) {
                        if (err) {
                            return next(err);
                        }

                        if (!req.user.admin && req.permission.isPrivate() && post && (post.userId !== req.user.id)) {
                            err = new Error('Access forbidden');
                            err.status = 403;

                            return next(err);
                        }

                        if (!post) {
                            err = new Error('Post not found');
                            err.status = 404;

                            return next(err);
                        }

                        post.comments(function(err, comments) {
                            if (err) {
                                return next(err);
                            }

                            if (!comments) {
                                comments = {};
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
                                published: post.published,
                                commentsEnabled: post.commentsEnabled,
                                commentsAllowed: post.commentsAllowed,
                                user: post.userId,
                                comments: _.pluck(comments, 'id')
                            });

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

                Post.all({
                    where: filter,
                    order: order + ' ' + sort,
                    skip: offset,
                    limit: limit
                }, function(err, posts) {
                    if (err) {
                        return next(err);
                    }

                    Post.count(function(err, count) {
                        if (err) {
                            return next(err);
                        }

                        data.post = [];

                        data.meta = {
                            total: count
                        };

                        if (!posts) {
                            return res.json(data);
                        }

                        var pending = posts.length;

                        var iterate = function(post) {
                            post.comments(function(err, comments) {
                                if (err) {
                                    return next(err);
                                }

                                if (!comments) {
                                    comments = {};
                                }

                                data.post.push({
                                    id: post.id,
                                    slug: post.slug,
                                    layout: post.layout,
                                    title: post.title,
                                    image: post.image,
                                    content: post.content,
                                    created: post.created,
                                    published: post.published,
                                    commentsEnabled: post.commentsEnabled,
                                    commentsAllowed: post.commentsAllowed,
                                    user: post.userId,
                                    comments: _.pluck(comments, 'id')
                                });

                                if (!--pending) {
                                    return res.json(data);
                                }

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
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            Post.find(req.params.id, function(err, post) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && post && (post.userId !== req.user.id)) {
                    err = new Error('Access forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!post) {
                    err = new Error('Post not found');
                    err.status = 404;

                    return next(err);
                }

                post.update(req.body.post, function(err) {
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
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            Post.find(req.params.id, function(err, post) {
                if (err) {
                    return next(err);
                }

                if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && post && (post.userId !== req.user.id)) {
                    err = new Error('Access forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!post) {
                    err = new Error('Post not found');
                    err.status = 404;

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