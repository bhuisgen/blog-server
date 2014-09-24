(function() {
    'use strict';

    var express = require('express');
    
    var router = express.Router({
        caseSensitive: true,
        strict: true
    });

    module.exports = function(config) {      
        router.use(function checkAccess(req, res, next) {
            if ((req.ip !== '127.0.0.1') && (req.ip !== '::1')) {
                var err = new Error('Unauthorized access');
                err.status = 403;

                return next(err);
            }

            return next();
        });

        router.get('/', function index(req, res) {
            var data = {};

            data.status = 'OK';

            return res.json(data);
        });

        router.get('/process', function proc(req, res) {
            var data = {};

            data.name = process.title;
            data.pid = process.pid;
            data.uptime = process.uptime();
            data.memory = process.memoryUsage();

            return res.json(data);
        });

        return router;
    };
}());