(function() {
    'use strict';

    var crypto = require('crypto');
    var path = require('path');
    var passport = require('passport');
    var uuid = require('node-uuid');

    var Schema = require('jugglingdb-model-loader');

    var LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;

    module.exports = function(config, router, r) {
        config.keys = require('../../../../config/keys');

        var options = config.database.options;

        options.modelLoader = {
            rootDirectory: path.normalize(__dirname + '/../../../..'),
            directory: 'app/models'
        };

        var schema = new Schema(config.database.type, options);

        var User = schema.loadDefinition('User');
        var ExternAccount = schema.loadDefinition('ExternAccount');

        router.use(passport.initialize());

        passport.use('linkedin', new LinkedInStrategy({
            clientID: config.keys.auth.linkedin.clientID,
            clientSecret: config.keys.auth.linkedin.clientSecret,
            callbackURL: config.keys.auth.linkedin.callbackURL,
            scope: ['r_emailaddress', 'r_basicprofile'],
            passReqToCallback: true
        }, function(req, token, refreshToken, profile, done) {
            if (!req.user) {
                ExternAccount.findOne({
                    where: {
                        provider: 'linkedin',
                        profileId: profile.id
                    },
                }, function(err, account) {
                    if (err) {
                        return done(err);
                    }

                    if (account) {
                        return done(null, account.user());
                    }

                    User.findOne({
                        where: {
                            email: profile.emails[0].value
                        }
                    }, function(err, user) {
                        if (err) {
                            return done(err);
                        }

                        if (user) {
                            return done(null, false);
                        }
                    });

                    var user = new User({
                        name: profile.displayName,
                        email: profile.emails[0].value
                    });

                    user.save(function(err) {
                        if (err) {
                            return done(err);
                        }

                        account = user.externAccounts.build({
                            provider: 'linkedin',
                            profileId: profile.id,
                            token: token,
                            displayName: profile.displayName,
                            email: profile.emails[0].value
                        });

                        account.save(function(err) {
                            if (err) {
                                return done(err);
                            }

                            return done(null, user);
                        });
                    });
                });
            } else {
                var user = req.user;

                ExternAccount.findOne({
                    where: {
                        provider: 'linkedin',
                        profileId: profile.id
                    },
                }, function(err, account) {
                    if (err) {
                        return done(err);
                    }

                    if (account) {
                        return done(null, account.user());
                    }

                    account = user.externAccounts.build({
                        provider: 'linkedin',
                        profileId: profile.id,
                        token: token,
                        displayName: profile.displayName,
                        email: profile.emails[0].value
                    });

                    account.save(function(err) {
                        if (err) {
                            return done(err);
                        }

                        return done(null, user);
                    });
                });
            }
        }));

        router.get('/auth/linkedin', function(req, res, next) {
            var state = crypto.randomBytes(20).toString('hex');

            passport.authenticate('linkedin', {
                state: state
            })(req, res, next);
        });

        router.get('/auth/linkedin/callback', function(req, res, next) {
            passport.authenticate('linkedin', function(err, user, info) {
                if (err) {
                    return next(err);
                }

                if (!user) {
                    res.status(401);

                    return res.json({
                        success: false,
                        message: 'User signin failed'
                    });
                }

                var token = uuid.v4();

                r.set(config.server.api.auth.redis.keyPrefix + config.server.api.auth.token.key + token, user.id, 'EX',
                    config.server.api.auth.token.expireTime, function(err)  {
                        if (err) {
                            return next(err);
                        }

                        res.json({
                            success: true,
                            message: 'User signin succeeded',
                            token: new Buffer(token).toString('base64')
                        });
                    });
            })(req, res, next);
        });
    };
}());