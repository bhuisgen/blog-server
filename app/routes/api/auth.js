(function() {
    'use strict';

    var local = require('./auth/local');
    var facebook = require('./auth/facebook');
    var github = require('./auth/github');
    var google = require('./auth/google');
    var linkedin = require('./auth/linkedin');
    var openid = require('./auth/openid');
    var twitter = require('./auth/twitter');

    module.exports = function(config, router, r) {
        router.post('/auth/signout', function signout(req, res, next) {
            if (!req.body.token) {
                res.status(401);

                return res.json({
                    success: false,
                    message: 'User signout failed'
                });
            }

            var token = new Buffer(req.body.token, 'base64').toString('ascii');

            r.get(config.server.api.auth.redis.keyPrefix + config.server.api.auth.tokens.key + ':' + token, function(err, id) {
                if (err) {
                    return next(err);
                }

                if (!id) {
                    res.status(401);

                    return res.json({
                        success: false,
                        message: 'User signout failed'
                    });
                }

                r.del(config.server.api.auth.redis.keyPrefix + config.server.api.auth.tokens.key + ':' + token, function(err) {
                    if (err) {
                        return next(err);
                    }

                    return res.json({
                        success: true,
                        message: 'User signout succeeded'
                    });
                });
            });
        });

        if (config.server.api.auth.providers.local) {
            local(config, router, r);
        }

        if (config.server.api.auth.providers.facebook) {
            facebook(config, router, r);
        }

        if (config.server.api.auth.providers.github) {
            github(config, router, r);
        }

        if (config.server.api.auth.providers.google) {
            google(config, router, r);
        }

        if (config.server.api.auth.providers.linkedin) {
            linkedin(config, router, r);
        }

        if (config.server.api.auth.providers.openid) {
            openid(config, router, r);
        }

        if (config.server.api.auth.providers.twitter) {
            twitter(config, router, r);
        }
    };
}());