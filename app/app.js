(function() {
    'use strict';

    var fs = require('fs');
    var path = require('path');
    var express = require('express');
    var bodyParser = require('body-parser');
    var winston = require('winston');
    var winstonSyslogNative = require('winston-syslog-native').SyslogNative;
    var expressWinston = require('express-winston');

    var config = {};
    config.server = require('../config/server');

    var app = express();

    var status = require('./routes/status');
    var api = require('./routes/api');

    app.disable('x-powered-by');
    app.enable('case sensitive routing', true);
    app.enable('strict routing', true);

    if (app.get('env') === 'development') {
        app.set('json spaces', 2);
    }

    if (config.server.errorLog) {
        var errorTransports = [];

        if (config.server.errorLog.console) {
            errorTransports.push(new(winston.transports.Console)({
                colorize: true,
                json: false
            }));
        }

        if (config.server.errorLog.file) {
            errorTransports.push(new(winston.transports.File)(
                config.server.errorLog.file));
        }

        if (config.server.errorLog.syslog) {
            errorTransports.push(new(winston.transports.SyslogNative)(
                config.server.errorLog.syslog
            ));
        }

        app.use(expressWinston.errorLogger({
            transports: errorTransports,
            dumpExceptions: true,
            showStack: true
        }));
    }

    if (config.server.accessLog) {
        var accessTransports = [];

        if (config.server.accessLog.console) {
            accessTransports.push(new(winston.transports.Console)({
                colorize: true,
                json: false
            }));
        }

        if (config.server.accessLog.file) {
            accessTransports.push(new(winston.transports.File)(
                config.server.accessLog.file));
        }

        if (config.server.accessLog.syslog) {
            accessTransports.push(new(winston.transports.SyslogNative)(
                config.server.accessLog.syslog
            ));
        }
        
        app.use(expressWinston.logger({
            transports: accessTransports,
            expressFormat: true
        }));
    }

    app.use(bodyParser.json());

    app.use(function cors(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if ('OPTIONS' === req.method) {
            return res.status(200).end();
        }

        return next();
    });

    app.use(function requestTimeout(req, res, next) {
        req.setTimeout(config.server.requestTimeout, function() {
            req.emit('timeout');
        });

        req.on('timeout', function() {
            if (res.headerSent) {
                return;
            }

            var err = new Error('Request Timeout');
            err.status = 408;

            return next(err);
        });

        return next();
    });

    app.use('/api', api(config));
    app.use('/status', status(config));

    app.use(express.static(path.join(config.server.root, config.server.publicDirectory)));

    app.use(function error404(req, res, next) {
        var err = new Error('Not Found');
        err.status = 404;

        return next(err);
    });

    app.use(function errorHandler(err, req, res, next) {
        res.status(err.status || 500);

        return res.json({
            success: false,
            message: err.message || 'Internal Server Error'
        });
    });

    module.exports = app;
}());