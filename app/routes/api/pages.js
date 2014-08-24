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
        var Page = schema.loadDefinition('Page');

        router.get('/pages/:id', function(req, res, next) {
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

                    if (!role.pagesRead) {
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

                            Page.find(req.params.id, function(err, page) {
                                if (err) {
                                    return next(err);
                                }

                                if (!page) {
                                    err = new Error('Page not found');
                                    err.status = 404;

                                    return next(err);
                                }

                                if (permission.isPrivate() && (page.userId !== req.user.id)) {
                                    err = new Error('Access forbidden');
                                    err.status = 403;

                                    return next(err);
                                }

                                page.author(function(err, user) {
                                    if (err) {
                                        return next(err);
                                    }

                                    if (!user) {
                                        err = new Error('User not found');
                                        err.status = 500;

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

        router.get('/pages', function(req, res, next) {
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

                    if (!role.pagesRead) {
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

                            Page.all({
                                where: filter,
                                order: order + ' ' + sort,
                                skip: offset,
                                limit: limit
                            }, function(err, pages) {
                                if (err) {
                                    return next(err);
                                }

                                data.page = [];
                                data.users = [];

                                Page.count(function(err, count) {
                                    if (err) {
                                        return next(err);
                                    }

                                    data.meta = {
                                        total: count
                                    };

                                    if (!pages) {
                                        res.json(data);
                                    }

                                    var pending = pages.length;
                                    var items = [];
                                    var users = {};

                                    var iterate = function(page) {
                                        page.author(function(err, user) {
                                            if (err) {
                                                return next(err);
                                            }

                                            if (!user) {
                                                err = new Error('User not found');
                                                err.status = 404;

                                                return next(err);
                                            }

                                            items.push({
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

                                            users[user.id] = {
                                                id: user.id,
                                                name: user.name,
                                                email: user.email,
                                                created: user.created,
                                                enabled: user.enabled
                                            };

                                            if (!--pending) {
                                                data.page = items;
                                                data.users = _.values(users);

                                                return res.json(data);
                                            }
                                        });
                                    };

                                    for (var i = 0; i < pages.length; i++) {
                                        iterate(pages[i]);
                                    }
                                });
                            });
                        });
                    });
                });
            });
        });

        router.put('/pages/:id', function(req, res, next) {
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

                    if (!role.pagesUpdate) {
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

                            if ((permission.isShared() || permission.isPrivate()) && (req.body.page.userId !== req.user.id)) {
                                err = new Error('Access forbidden');
                                err.status = 403;

                                return next(err);
                            }

                            Page.find(req.params.id, function(err, page) {
                                if (err) {
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

                                    res.send(200);
                                });
                            });
                        });
                    });
                });
            });
        });

        router.post('/pages', function(req, res, next) {
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

                    if (!role.pagesCreate) {
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

                            if ((permission.isShared() || permission.isPrivate()) && (req.body.page.userId !== req.user.id)) {
                                err = new Error('Access forbidden');
                                err.status = 403;

                                return next(err);
                            }

                            var page = new Page(req.body.page);

                            page.save(function(err) {
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

        router.delete('/pages/:id', function(req, res, next) {
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

                    if (!role.pagesDelete) {
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

                            Page.find(req.params.id, function(err, page) {
                                if (err) {
                                    return next(err);
                                }

                                if (!page) {
                                    err = new Error('Page not found');
                                    err.status = 404;

                                    return next(err);
                                }

                                if ((permission.isShared() || permission.isPrivate()) && (page.userId !== req.user.id)) {
                                    err = new Error('Access forbidden');
                                    err.status = 403;

                                    return next(err);
                                }

                                page.destroy(function(err) {
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