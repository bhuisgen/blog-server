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
        var Comment = schema.loadDefinition('Comment');

        router.get('/comments/:id', function(req, res, next) {
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

                    if (!role.commentsRead) {
                        err = new Error('Access forbidden');
                        err.status = 403;

                        return next(err);
                    }

                    Collection.findOne({
                        where: {
                            name: 'Comments'
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

                            Comment.find(req.params.id, function(err, comment) {
                                if (err) {
                                    return next(err);
                                }

                                if (!comment) {
                                    err = new Error('Comment not found');
                                    err.status = 404;

                                    return next(err);
                                }

                                if (permission.isPrivate() && (comment.userId !== req.user.id)) {
                                    err = new Error('Access forbidden');
                                    err.status = 403;

                                    return next(err);
                                }

                                data.comment = {
                                    id: comment.id,
                                    content: comment.content,
                                    author: comment.author,
                                    email: comment.email,
                                    ip: comment.ip,
                                    created: comment.created,
                                    validated: comment.validated,
                                    post: comment.postId,
                                    user: comment.userId,
                                };

                                res.json(data);
                            });
                        });
                    });
                });
            });
        });

        router.get('/comments', function(req, res, next) {
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

                    if (!role.commentsRead) {
                        err = new Error('Access forbidden');
                        err.status = 403;

                        return next(err);
                    }

                    Collection.findOne({
                        where: {
                            name: 'Comments'
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

                            Comment.all({
                                where: filter,
                                order: order + ' ' + sort,
                                skip: offset,
                                limit: limit
                            }, function(err, comments) {
                                if (err) {
                                    return next(err);
                                }

                                data.comment = [];

                                Comment.count(function(err, count) {
                                    if (err) {
                                        return next(err);
                                    }

                                    data.meta = {
                                        total: count
                                    };

                                    if (!comments) {
                                        res.json(data);
                                    }

                                    var pending = comments.length;
                                    var items = [];

                                    var iterate = function(comment) {
                                        items.push({
                                            id: comment.id,
                                            content: comment.content,
                                            author: comment.author,
                                            email: comment.email,
                                            ip: comment.ip,
                                            created: comment.created,
                                            validated: comment.validated,
                                            post: comment.postId,
                                            user: comment.userId,
                                        });

                                        if (!--pending) {
                                            data.comment = items;

                                            return res.json(data);
                                        }
                                    };

                                    for (var i = 0; i < comments.length; i++) {
                                        iterate(comments[i]);
                                    }
                                });
                            });
                        });
                    });
                });
            });
        });

        router.put('/comments/:id', function(req, res, next) {
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

                    if (!role.commentsUpdate) {
                        err = new Error('Access forbidden');
                        err.status = 403;

                        return next(err);
                    }

                    Collection.findOne({
                        where: {
                            name: 'Comments'
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

                            Comment.find(req.params.id, function(err, comment) {
                                if (err) {
                                    return next(err);
                                }

                                if (!comment) {
                                    err = new Error('Comment not found');
                                    err.status = 404;

                                    return next(err);
                                }

                                comment.update(req.body.comment, function(err) {
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

        router.post('/comments', function(req, res, next) {
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

                    if (!role.commentsCreate) {
                        err = new Error('Access forbidden');
                        err.status = 403;

                        return next(err);
                    }

                    Collection.findOne({
                        where: {
                            name: 'Comments'
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

                            if ((permission.isShared() || permission.isPrivate()) && (req.body.comment.userId !== req.user.id)) {
                                err = new Error('Access forbidden');
                                err.status = 403;

                                return next(err);
                            }

                            var comment = new Comment(req.body.comment);

                            comment.save(function(err) {
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

        router.delete('/comments/:id', function(req, res, next) {
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

                    if (!role.commentsDelete) {
                        err = new Error('Access forbidden');
                        err.status = 403;

                        return next(err);
                    }

                    Collection.findOne({
                        where: {
                            name: 'Comments'
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

                            Comment.find(req.params.id, function(err, comment) {
                                if (err) {
                                    return next(err);
                                }

                                if (!comment) {
                                    err = new Error('Comment not found');
                                    err.status = 404;

                                    return next(err);
                                }

                                if ((permission.isShared() || permission.isPrivate()) && (comment.userId !== req.user.id)) {
                                    err = new Error('Access forbidden');
                                    err.status = 403;

                                    return next(err);
                                }

                                comment.destroy(function(err) {
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