(function() {
    'use strict';

    var path = require('path');
    var _ = require('lodash');

    var Schema = require('jugglingdb-model-loader');

    module.exports = function(config, router) {
        var schema = new Schema(config.database.type, {
            host: config.database.host,
            port: config.database.port,
            database: config.database.name,
            modelLoader: {
                rootDirectory: path.normalize(__dirname + '/../../..'),
                directory: 'app/models'
            }
        });

        var Collection = schema.loadDefinition('Collection');
        var Post = schema.loadDefinition('Post');

        router.get('/posts/:id', function(req, res, next) {
            var data = {};
            var err;

            if (!req.user) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            req.user.group(function(err, group) {
                if (err) {
                    return next(err);
                }

                if (!group) {
                    err = new Error('Group not found');
                    err.status = 500;

                    return next(err);
                }

                group.role(function(err, role) {
                    if (err) {
                        return next(err);
                    }

                    if (!role) {
                        err = new Error('Role not found');
                        err.status = 500;

                        return next(err);
                    }

                    if (!role.postsRead) {
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
                            err = new Error('Collection not found');
                            err.status = 500;

                            return next(err);
                        }

                        collection.permission(function(err, permission) {
                            if (err) {
                                return next(err);
                            }

                            if (!permission) {
                                err = new Error('Permission not found');
                                err.status = 500;

                                return next(err);
                            }

                            Post.find(req.params.id, function(err, post) {
                                if (err) {
                                    return next(err);
                                }

                                if (!post) {
                                    err = new Error('Post not found');
                                    err.status = 404;

                                    return next(err);
                                }

                                if (permission.isPrivate() && (post.userId !== req.user.id)) {
                                    err = new Error('Access forbidden');
                                    err.status = 403;

                                    return next(err);
                                }

                                post.author(function(err, user) {
                                    if (err) {
                                        return next(err);
                                    }

                                    if (!user) {
                                        err = new Error('User not found');
                                        err.status = 500;

                                        return next(err);
                                    }

                                    post.comments(function(err, comments) {
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
                                            published: post.published,
                                            commentsEnabled: post.commentsEnabled,
                                            commentsAllowed: post.commentsAllowed,
                                            user: post.userId,
                                            comments: _.pluck(comments, 'id')
                                        };

                                        data.users = [{
                                            id: user.id,
                                            name: user.name,
                                            email: user.email,
                                            created: user.created,
                                            enabled: user.enabled
                                        }];

                                        res.json(data);
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        router.get('/posts', function(req, res, next) {
            var data = {};
            var err;

            if (!req.user) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            req.user.group(function(err, group) {
                if (err) {
                    return next(err);
                }

                if (!group) {
                    err = new Error('Group not found');
                    err.status = 500;

                    return next(err);
                }

                group.role(function(err, role) {
                    if (err) {
                        return next(err);
                    }

                    if (!role) {
                        err = new Error('Role not found');
                        err.status = 500;

                        return next(err);
                    }

                    if (!role.postsRead) {
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
                            err = new Error('Collection not found');
                            err.status = 500;

                            return next(err);
                        }

                        collection.permission(function(err, permission) {
                            if (err) {
                                return next(err);
                            }

                            if (!permission) {
                                err = new Error('Permission not found');
                                err.status = 500;

                                return next(err);
                            }

                            var filter = {};

                            if (typeof req.query.slug !== 'undefined') {
                                filter.slug = req.query.slug;
                            }

                            if (typeof req.query.created !== 'undefined') {
                                filter.created = req.query.created;
                            }

                            if (typeof req.query.published !== 'undefined') {
                                filter.published = req.query.published;
                            }

                            if (permission.isPrivate()) {
                                filter.userId = req.user.id;
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

                                data.post = [];
                                data.users = [];

                                Post.count(function(err, count) {
                                    if (err) {
                                        return next(err);
                                    }

                                    data.meta = {
                                        total: count
                                    };

                                    if (!posts) {
                                        res.json(data);
                                    }

                                    var pending = posts.length;
                                    var items = [];
                                    var users = {};

                                    var iterate = function(post) {
                                        post.author(function(err, user) {
                                            if (err) {
                                                return next(err);
                                            }

                                            if (!user) {
                                                err = new Error('User not found');
                                                err.status = 404;

                                                return next(err);
                                            }

                                            items.push({
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

                                            users[user.id] = {
                                                id: user.id,
                                                name: user.name,
                                                email: user.email,
                                                created: user.created,
                                                enabled: user.enabled
                                            };

                                            if (!--pending) {
                                                data.post = items;
                                                data.users = _.values(users);

                                                return res.json(data);
                                            }

                                        });
                                    };

                                    for (var i = 0; i < posts.length; i++) {
                                        iterate(posts[i]);
                                    }
                                });
                            });
                        });
                    });
                });
            });
        });

        router.put('/posts/:id', function(req, res, next) {
            var err;

            if (!req.user) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            req.user.group(function(err, group) {
                if (err) {
                    return next(err);
                }

                if (!group) {
                    err = new Error('Group not found');
                    err.status = 500;

                    return next(err);
                }

                group.role(function(err, role) {
                    if (err) {
                        return next(err);
                    }

                    if (!role) {
                        err = new Error('Role not found');
                        err.status = 500;

                        return next(err);
                    }

                    if (!role.postsUpdate) {
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
                            err = new Error('Collection not found');
                            err.status = 500;

                            return next(err);
                        }

                        collection.permission(function(err, permission) {
                            if (err) {
                                return next(err);
                            }

                            if (!permission) {
                                err = new Error('Permission not found');
                                err.status = 500;

                                return next(err);
                            }

                            if (permission.isReadOnly()) {
                                err = new Error('Access forbidden');
                                err.status = 403;

                                return next(err);
                            }

                            if ((permission.isShared() || permission.isPrivate()) && (req.body.post.userId !== req.user.id)) {
                                err = new Error('Access forbidden');
                                err.status = 403;

                                return next(err);
                            }

                            Post.find(req.params.id, function(err, post) {
                                if (err) {
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

                                    res.send(200);
                                });
                            });
                        });
                    });
                });
            });
        });

        router.post('/posts', function(req, res, next) {
            var err;

            if (!req.user) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            req.user.group(function(err, group) {
                if (err) {
                    return next(err);
                }

                if (!group) {
                    err = new Error('Group not found');
                    err.status = 500;

                    return next(err);
                }

                group.role(function(err, role) {
                    if (err) {
                        return next(err);
                    }

                    if (!role) {
                        err = new Error('Role not found');
                        err.status = 500;

                        return next(err);
                    }

                    if (!role.postsCreate) {
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
                            err = new Error('Collection not found');
                            err.status = 500;

                            return next(err);
                        }

                        collection.permission(function(err, permission) {
                            if (err) {
                                return next(err);
                            }

                            if (!permission) {
                                err = new Error('Permission not found');
                                err.status = 500;

                                return next(err);
                            }

                            if (permission.isReadOnly()) {
                                err = new Error('Access forbidden');
                                err.status = 403;

                                return next(err);
                            }

                            if ((permission.isShared() || permission.isPrivate()) && (req.body.post.userId !== req.user.id)) {
                                err = new Error('Access forbidden');
                                err.status = 403;

                                return next(err);
                            }

                            var post = new Post(req.body.post);

                            post.save(function(err) {
                                if (err) {
                                    return next(err);
                                }

                                res.send(200);
                            });
                        });
                    });
                });
            });
        });

        router.delete('/posts/:id', function(req, res, next) {
            var err;

            if (!req.user) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            req.user.group(function(err, group) {
                if (err) {
                    return next(err);
                }

                if (!group) {
                    err = new Error('Group not found');
                    err.status = 500;

                    return next(err);
                }

                group.role(function(err, role) {
                    if (err) {
                        return next(err);
                    }

                    if (!role) {
                        err = new Error('Role not found');
                        err.status = 500;

                        return next(err);
                    }

                    if (!role.postsDelete) {
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

                        collection.permission(function(err, permission) {
                            if (err) {
                                return next(err);
                            }

                            if (!permission) {
                                err = new Error('Permission not found');
                                err.status = 500;

                                return next(err);
                            }

                            if (permission.isReadOnly()) {
                                err = new Error('Access forbidden');
                                err.status = 403;

                                return next(err);
                            }

                            Post.find(req.params.id, function(err, post) {
                                if (err) {
                                    return next(err);
                                }

                                if (!post) {
                                    err = new Error('Post not found');
                                    err.status = 404;

                                    return next(err);
                                }

                                if ((permission.isShared() || permission.isPrivate()) && (post.userId !== req.user.id)) {
                                    err = new Error('Access forbidden');
                                    err.status = 403;

                                    return next(err);
                                }

                                post.destroy(function(err) {
                                    if (err) {
                                        return next(err);
                                    }

                                    res.send(200);
                                });
                            });
                        });
                    });
                });
            });
        });
    };
}());