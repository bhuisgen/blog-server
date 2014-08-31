(function() {
    'use strict';

    var path = require('path');
    var passport = require('passport');
    var uuid = require('node-uuid');

    var Schema = require('jugglingdb-model-loader');

    var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

    module.exports = function(config, router, r) {
        config.keys = require('../../../../config/keys');

        var schema = new Schema(config.database.type, {
            host: config.database.host,
            port: config.database.port,
            database: config.database.name,
            modelLoader: {
                rootDirectory: path.normalize(__dirname + '/../../../..'),
                directory: 'app/models'
            }
        });

        var User = schema.loadDefinition('User');
        var ExternAccount = schema.loadDefinition('ExternAccount');

        router.use(passport.initialize());

        passport.use('google', new GoogleStrategy({
            clientID: config.keys.auth.google.clientID,
            clientSecret: config.keys.auth.google.clientSecret,
            callbackURL: config.keys.auth.google.callbackURL,
            passReqToCallback: true
        }, function(req, token, refreshToken, profile, done) {
            if (!req.user) {
                ExternAccount.findOne({
                    where: {
                        provider: 'google',
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
                            provider: 'google',
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
                        provider: 'google',
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
                        provider: 'google',
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

        router.get('/auth/google', function(req, res, next) {
            passport.authenticate('google', {
                scope: ['profile', 'email']
            })(req, res, next);
        });

        router.get('/auth/google/callback', function(req, res, next) {
            passport.authenticate('google', function(err, user, info) {
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