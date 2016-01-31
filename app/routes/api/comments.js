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

    var Comment = schema.loadDefinition('Comment');

    router.post('/comments', function createComment(req, res, next) {
      var err;

      if (!req.user.admin && req.permission.isReadOnly()) {
        err = new Error('Forbidden');
        err.status = 403;

        return next(err);
      }

      var comment = new Comment(req.body.comment);

      if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && comment.userId && (comment.userId !== req.user.id)) {
        err = new Error('Forbidden');
        err.status = 403;

        return next(err);
      }

      comment.save(function(err) {
        if (err) {
          return next(err);
        }

        return res.status(200).end();
      });
    });

    router.get('/comments/:id', function readComment(req, res, next) {
      var data = {};

      Comment.find(req.params.id, function(err, comment) {
        if (err) {
          return next(err);
        }

        if ((!req.user.admin &&
          (req.permission.isPrivate() && comment && comment.userId && (comment.userId !== req.user.id)) ||
          (!req.role.commentsReadNotValidated && comment && !comment.validated) ||
          (!req.role.commentsReadNotAllowed && comment && !comment.allowed))) {
          err = new Error('Forbidden');
          err.status = 403;

          return next(err);
        }

        if (!comment) {
          err = new Error('Not Found');
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
          updated: comment.updated,
          validated: comment.validated,
          allowed: comment.allowed,
          post: comment.postId,
          user: comment.userId
        };

        return res.json(data);
      });
    });

    router.get('/comments', function readComments(req, res, next) {
      var data = {};
      var err;

      if (req.query.ids) {
        var pending = req.query.ids.length;

        data.comment = [];

        var iterate = function(id) {
          Comment.find(id, function(err, comment) {
            if (err) {
              return next(err);
            }

            if ((!req.user.admin &&
              (req.permission.isPrivate() && comment && comment.userId && (comment.userId !== req.user.id)) ||
              (!req.role.commentsReadNotValidated && comment && !comment.validated) ||
              (!req.role.commentsReadNotAllowed && comment && !comment.allowed))) {
              err = new Error('Forbidden');
              err.status = 403;

              return next(err);
            }

            if (!comment) {
              err = new Error('Not Found');
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
              updated: comment.updated,
              validated: comment.validated,
              allowed: comment.allowed,
              post: comment.postId,
              user: comment.userId
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

        if (req.query.validated) {
          filter.validated = req.query.validated;
        }

        if (req.query.allowed) {
          filter.allowed = req.query.allowed;
        }

        if (!req.user.admin && req.permission.isPrivate()) {
          filter.userId = req.user.id;
        }

        if (!req.user.admin && !req.role.commentsReadNotValidated) {
          filter.validated = true;
        }

        if (!req.user.admin && !req.role.commentsReadNotAllowed) {
          filter.allowed = true;
        }

        if (Object.keys(filter).length === 0) {
          filter = null;
        }

        var order = req.query.order || 'id';
        var sort = req.query.sort || 'ASC';
        var offset = parseInt(req.query.offset, 10) || 0;
        var limit = parseInt(req.query.limit, 10) || config.server.api.maxItems;
        if ((offset < 0) || (limit < 0)) {
          err = new Error('Bad Request');
          err.status = 400;

          return next(err);
        }

        Comment.count(filter, function(err, count) {
          if (err) {
            return next(err);
          }

          if (!count) {
            err = new Error('Not Found');
            err.status = 404;

            return next(err);
          }

          if (offset >= count) {
            err = new Error('Bad Request');
            err.status = 400;

            return next(err);
          }

          Comment.all({
            where: filter,
            order: order + ' ' + sort,
            skip: offset,
            limit: limit
          }, function(err, comments) {
            if (err) {
              return next(err);
            }

            if (!comments.length) {
              err = new Error('Not Found');
              err.status = 404;

              return next(err);
            }

            data.comment = [];
            data.meta = {
              count: count
            };

            var pending = comments.length;

            var iterate = function(comment) {
              if (!req.user.admin && req.permission.isPrivate() && comment.userId && (comment.userId !== req.user.id)) {
                err = new Error('Forbidden');
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
                updated: comment.updated,
                validated: comment.validated,
                allowed: comment.allowed,
                post: comment.postId,
                user: comment.userId
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

      if (!req.user.admin && req.permission.isReadOnly()) {
        err = new Error('Forbidden');
        err.status = 403;

        return next(err);
      }

      Comment.find(req.params.id, function(err, comment) {
        if (err) {
          return next(err);
        }

        if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && comment && comment.userId && (comment.userId !== req.user.id)) {
          err = new Error('Forbidden');
          err.status = 403;

          return next(err);
        }

        if (!comment) {
          err = new Error('Not Found');
          err.status = 404;

          return next(err);
        }

        req.body.comment.updated = new Date();

        comment.updateAttributes(req.body.comment, function(err) {
          if (err) {
            return next(err);
          }

          return res.status(200).end();
        });
      });
    });

    router.delete('/comments/:id', function deleteComment(req, res, next) {
      var err;

      if (!req.user.admin && req.permission.isReadOnly()) {
        err = new Error('Forbidden');
        err.status = 403;

        return next(err);
      }

      Comment.find(req.params.id, function(err, comment) {
        if (err) {
          return next(err);
        }

        if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && comment && comment.userId && (comment.userId !== req.user.id)) {
          err = new Error('Forbidden');
          err.status = 403;

          return next(err);
        }

        if (!comment) {
          err = new Error('Not Found');
          err.status = 404;

          return next(err);
        }

        comment.destroy(function(err) {
          if (err) {
            return next(err);
          }

          return res.status(200).end();
        });
      });
    });
  };
}());
