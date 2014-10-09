(function() {
    'use strict';

    var os = require('os');

    var express = require('express');

    var router = express.Router({
        caseSensitive: true,
        strict: true
    });

    module.exports = function(config) {
        router.use(function checkAccess(req, res, next) {
            if ((req.ip !== '127.0.0.1') && (req.ip !== '::1')) {
                var err = new Error('Forbidden');
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

        router.get('/os', function proc(req, res) {
            var data = {};

            data.hostname = os.hostname();
            data.type = os.type();
            data.platform = os.platform();
            data.arch = os.arch();
            data.release = os.release();
            data.uptime = os.uptime();
            data.loadavg = os.loadavg();
            data.totalmem = os.totalmem();
            data.freemem = os.freemem();
            data.cpus = os.cpus();
            data.networkInterfaces = os.networkInterfaces();

            return res.json(data);
        });

        return router;
    };
}());