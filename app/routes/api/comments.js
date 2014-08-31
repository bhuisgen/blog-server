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
                    if (req.role.commentsCreate) {
                        allow = true;
                    }
                    break;

                case 'GET':
                    if (req.role.commentsRead) {
                        allow = true;
                    }
                    break;

                case 'PUT':
                    if (req.role.commentsUpdate) {
                        allow = true;
                    }
                    break;

                case 'DELETE':
                    if (req.role.commentsDelete) {
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

        router.post('/comments', function createComment(req, res, next) {
            var err;

            if (req.permission.isReadOnly()) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            var comment = new Comment(req.body.comment);

            if ((req.permission.isShared() || req.permission.isPrivate()) && (comment.userId !== req.user.id)) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            comment.save(function(err) {
                if (err) {
                    return next(err);
                }

                return res.send(200);
            });
        });

        router.get('/comments/:id', function readComment(req, res, next) {
            var data = {};

            Comment.find(req.params.id, function(err, comment) {
                if (err) {
                    return next(err);
                }

                if (req.permission.isPrivate() && comment && (comment.userId !== req.user.id)) {
                    err = new Error('Access forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!comment) {
                    err = new Error('Comment not found');
                    err.status = 404;

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
                    allowed: comment.allowed,
                    post: comment.postId,
                    user: comment.userId,
                };

                return res.json(data);
            });
        });

        router.get('/comments', function readComments(req, res, next) {
            var data = {};

            if (req.query.ids) {
                var pending = req.query.ids.length;

                data.comment = [];

                var iterate = function(id) {
                    Comment.find(id, function(err, comment) {
                        if (err) {
                            return next(err);
                        }

                        if (req.permission.isPrivate() && comment && (comment.userId !== req.user.id)) {
                            err = new Error('Access forbidden');
                            err.status = 403;

                            return next(err);
                        }

                        if (!comment) {
                            err = new Error('Comment not found');
                            err.status = 404;

                            return next(err);
                        }

                        data.comment.push({
                            id: comment.id,
                            content: comment.content,
                            author: comment.author,
                            email: comment.email,
                            ip: comment.ip,
                            created: comment.created,
                            validated: comment.validated,
                            allowed: comment.allowed,
                            post: comment.postId,
                            user: comment.userId,
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

                if (req.query.author) {
                    filter.author = req.query.author;
                }

                if (req.query.email) {
                    filter.email = req.query.email;
                }

                if (req.query.created) {
                    filter.created = req.query.created;
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

                    Comment.count(function(err, count) {
                        if (err) {
                            return next(err);
                        }

                        data.comment = [];

                        data.meta = {
                            total: count
                        };

                        if (!comments) {
                            return res.json(data);
                        }

                        var pending = comments.length;

                        var iterate = function(comment) {
                            if (req.permission.isPrivate() && (comment.userId !== req.user.id)) {
                                err = new Error('Access forbidden');
                                err.status = 403;

                                return next(err);
                            }

                            data.comment.push({
                                id: comment.id,
                                content: comment.content,
                                author: comment.author,
                                email: comment.email,
                                ip: comment.ip,
                                created: comment.created,
                                validated: comment.validated,
                                allowed: comment.allowed,
                                post: comment.postId,
                                user: comment.userId,
                            });

                            if (!--pending) {
                                return res.json(data);
                            }
                        };

                        for (var i = 0; i < comments.length; i++) {
                            iterate(comments[i]);
                        }
                    });
                });
            }
        });

        router.put('/comments/:id', function updateComment(req, res, next) {
            var err;

            if (req.permission.isReadOnly()) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            Comment.find(req.params.id, function(err, comment) {
                if (err) {
                    return next(err);
                }

                if ((req.permission.isShared() || req.permission.isPrivate()) && comment && (comment.userId !== req.user.id)) {
                    err = new Error('Access forbidden');
                    err.status = 403;

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

                    return res.send(200);
                });
            });
        });

        router.delete('/comments/:id', function deleteComment(req, res, next) {
            var err;

            if (req.permission.isReadOnly()) {
                err = new Error('Access forbidden');
                err.status = 403;

                return next(err);
            }

            Comment.find(req.params.id, function(err, comment) {
                if (err) {
                    return next(err);
                }

                if ((req.permission.isShared() || req.permission.isPrivate()) && comment && (comment.userId !== req.user.id)) {
                    err = new Error('Access forbidden');
                    err.status = 403;

                    return next(err);
                }

                if (!comment) {
                    err = new Error('Comment not found');
                    err.status = 404;

                    return next(err);
                }

                comment.destroy(function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.send(200);
                });
            });
        });
    };
}());