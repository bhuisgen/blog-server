(function() {
    'use strict';

    var express = require('express');

    var auth = require('./api/auth');    
    var users = require('./api/users');
    var groups = require('./api/groups');
    var roles = require('./api/roles');
    var pages = require('./api/pages');
    var posts = require('./api/posts');
    var comments = require('./api/comments');

    var router = express.Router({
        caseSensitive: true,
        strict: true
    });

    module.exports = function(config) {
        if (!config.server.api) {
            return router;
        }

        config.database = require('../../config/database');

        router.use(function(req, res, next) {
            var header = req.get('Accepts');
            if (!header) {
                return next();
            }

            var ret = header.match(/^application\/vnd\.api\.v(\d)/);
            if (!ret) {
                return next();
            }

            req.api = ret[1];

            next();
        });

        auth(config, router);

        users(config, router);
        groups(config, router);
        roles(config, router);
        pages(config, router);
        posts(config, router);
        users(config, router);
        comments(config, router);

        return router;
    };
}());