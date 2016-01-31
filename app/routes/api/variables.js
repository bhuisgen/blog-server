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

    var Variable = schema.loadDefinition('Variable');

    router.post('/variables', function createVariable(req, res, next) {
      var err;

      if (!req.user.admin && req.permission.isReadOnly()) {
        err = new Error('Forbidden');
        err.status = 403;

        return next(err);
      }

      var variable = new Variable(req.body.variable);

      if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && variable.userId && (variable.userId !== req.user.id)) {
        err = new Error('Forbidden');
        err.status = 403;

        return next(err);
      }

      variable.save(function(err) {
        if (err) {
          return next(err);
        }

        return res.status(200).end();
      });
    });

    router.get('/variables/:id', function readVariable(req, res, next) {
      var data = {};

      Variable.find(req.params.id, function(err, variable) {
        if (err) {
          return next(err);
        }

        if (!req.user.admin && req.permission.isPrivate() && variable && variable.userId && (variable.userId !== req.user.id)) {
          err = new Error('Forbidden');
          err.status = 403;

          return next(err);
        }

        if (!variable) {
          err = new Error('Not Found');
          err.status = 404;

          return next(err);
        }

        data.variable = {
          id: variable.id,
          name: variable.name,
          value: variable.value
        };

        return res.json(data);
      });
    });

    router.get('/variables', function readVariables(req, res, next) {
      var data = {};
      var err;

      if (req.query.ids) {
        var pending = req.query.ids.length;

        data.variable = [];

        var iterate = function(id) {
          Variable.find(id, function(err, variable) {
            if (err) {
              return next(err);
            }

            if (!req.user.admin && req.permission.isPrivate() && variable && variable.userId && (variable.userId !== req.user.id)) {
              err = new Error('Forbidden');
              err.status = 403;

              return next(err);
            }

            if (!variable) {
              err = new Error('Not Found');
              err.status = 404;

              return next(err);
            }

            data.variable.push({
              id: variable.id,
              name: variable.name,
              value: variable.value
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

        if (req.query.name) {
          filter.name = req.query.name;
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

        Variable.count(filter, function(err, count) {
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

          Variable.all({
            where: filter,
            order: order + ' ' + sort,
            skip: offset,
            limit: limit
          }, function(err, variables) {
            if (err) {
              return next(err);
            }

            if (!variables.length) {
              err = new Error('Not Found');
              err.status = 404;

              return next(err);
            }

            data.variable = [];
            data.meta = {
              count: count
            };

            var pending = variables.length;

            var iterate = function(variable) {
              if (!req.user.admin && req.permission.isPrivate() && variable.userId && (variable.userId !== req.user.id)) {
                err = new Error('Forbidden');
                err.status = 403;

                return next(err);
              }

              data.variable.push({
                id: variable.id,
                name: variable.name,
                value: variable.value
              });

              if (!--pending) {
                return res.json(data);
              }
            };

            for (var i = 0; i < variables.length; i++) {
              iterate(variables[i]);
            }
          });
        });
      }
    });

    router.put('/variables/:id', function updateVariable(req, res, next) {
      var err;

      if (!req.user.admin && req.permission.isReadOnly()) {
        err = new Error('Forbidden');
        err.status = 403;

        return next(err);
      }

      Variable.find(req.params.id, function(err, variable) {
        if (err) {
          return next(err);
        }

        if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && variable && variable.userId && (variable.userId !== req.user.id)) {
          err = new Error('Forbidden');
          err.status = 403;

          return next(err);
        }

        if (!variable) {
          err = new Error('Not Found');
          err.status = 404;

          return next(err);
        }

        variable.updateAttributes(req.body.variable, function(err) {
          if (err) {
            return next(err);
          }

          return res.status(200).end();
        });
      });
    });

    router.delete('/variables/:id', function deleteVariable(req, res, next) {
      var err;

      if (!req.user.admin && req.permission.isReadOnly()) {
        err = new Error('Forbidden');
        err.status = 403;

        return next(err);
      }

      Variable.find(req.params.id, function(err, variable) {
        if (err) {
          return next(err);
        }

        if (!req.user.admin && (req.permission.isShared() || req.permission.isPrivate()) && variable && variable.userId && (variable.userId !== req.user.id)) {
          err = new Error('Forbidden');
          err.status = 403;

          return next(err);
        }

        if (!variable) {
          err = new Error('Not Found');
          err.status = 404;

          return next(err);
        }

        variable.destroy(function(err) {
          if (err) {
            return next(err);
          }

          return res.status(200).end();
        });
      });
    });
  };
}());
