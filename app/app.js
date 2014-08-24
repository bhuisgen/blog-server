(function() {
    'use strict';

    var fs = require('fs');
    var path = require('path');
    var express = require('express');
    var logger = require('morgan');
    var bodyParser = require('body-parser');

    var config = {};
    config.server = require('../config/server');

    var app = express();

    var status = require('./routes/status');
    var api = require('./routes/api');

    app.enable('case sensitive routing', true);
    app.enable('strict routing', true);

    if (app.get('env') === 'development') {
        app.set('json spaces', 2);
        app.use(logger('dev'));
    }

    if (app.get('env') === 'production') {
        app.disable('x-powered-by');

        if (config.server.logger && config.server.logger.enable) {
            var file = path.resolve(config.server.root, config.server.logger.file);

            app.use(logger({
                format: config.server.logger.format,
                stream: fs.createWriteStream(file, {
                    flags: 'a',
                }),
                buffer: config.server.logger.duration,
            }));
        }
    }
    app.use(bodyParser.json());

    app.use(function(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if ('OPTIONS' === req.method) {
            res.send(200);
        }

        next();
    });

    app.use(function(req, res, next) {
        req.setTimeout(config.server.responseTimeout, function() {
            req.emit('timeout');
        });

        req.on('timeout', function() {
            if (res.headerSent) {
                return;
            }

            var err = new Error('Response timeout');
            err.status = 408;

            return next(err);
        });

        next();
    });

    app.use('/status', status(config));
    app.use('/api', api(config));

    app.use(express.static(path.join(config.server.root, config.server.publicDirectory)));

    app.use(function(req, res, next) {
        var err = new Error('Page not found');
        err.status = 404;

        next(err);
    });

    app.use(function(err, req, res, next) {
        if (app.get('env') === 'development') {
            console.error(err.stack);
        }

        res.status(err.status || 500);
        res.json({
            success: false,
            message: err.message
        });
    });

    module.exports = app;
}());