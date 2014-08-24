(function() {
    'use strict';

    var express = require('express');
    
    var router = express.Router({
        caseSensitive: true,
        strict: true
    });

    module.exports = function(config) {
        if (!config.server.status) {
            return router;
        }

        router.use(function(req, res, next) {
            if ((req.ip !== '127.0.0.1') && (req.ip !== '::1')) {
                var err = new Error('Unauthorized access');
                err.status = 403;

                return next(err);
            }

            next();
        });

        router.get('/', function(req, res) {
            var data = {};

            data.status = 'OK';

            res.json(data);
        });

        router.get('/process', function(req, res) {
            var data = {};

            data.name = process.title;
            data.pid = process.pid;
            data.uptime = process.uptime();

            data.memory = process.memoryUsage();

            res.json(data);
        });

        return router;
    };
}());