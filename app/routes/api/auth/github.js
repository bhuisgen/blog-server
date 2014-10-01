(function() {
    'use strict';

    var path = require('path');
    var passport = require('passport');
    var uuid = require('node-uuid');

    var Schema = require('jugglingdb-model-loader');

    var GitHubStrategy = require('passport-github').Strategy;

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

        passport.use('github', new GitHubStrategy({
            clientID: config.keys.auth.github.clientID,
            clientSecret: config.keys.auth.github.clientSecret,
            callbackURL: config.keys.auth.github.callbackURL,
            passReqToCallback: true
        }, function(req, token, refreshToken, profile, done) {
            if (!req.user) {
                ExternAccount.findOne({
                    where: {
                        provider: 'github',
                        profileId: profile.id
                    },
                }, function(err, account) {
                    if (err) {
                        return done(err);
                    }

                    if (account) {
                        account.user(function(err, user) {
                            if (err) {
                                return done(err);
                            }

                            if (!user) {
                                return done(null, false);
                            }

                            user.updateAttribute('lastLogin', new Date(), function(err) {
                                if (err) {
                                    return done(err);
                                }

                                return done(null, user);
                            });
                        });
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

                        user = new User({
                            name: profile.displayName,
                            email: profile.emails[0].value,
                            lastLogin: new Date()
                        });

                        user.save(function(err) {
                            if (err) {
                                return done(err);
                            }

                            account = user.externAccounts.build({
                                provider: 'github',
                                profileId: profile.id,
                                token: token,
                                username: profile.username,
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
                });
            } else {
                var user = req.user;

                ExternAccount.findOne({
                    where: {
                        provider: 'github',
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
                        provider: 'github',
                        profileId: profile.id,
                        token: token,
                        username: profile.username,
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

        router.get('/auth/github', function(req, res, next) {
            passport.authenticate('github')(req, res, next);
        });

        router.get('/auth/github/callback', function(req, res, next) {
            passport.authenticate('github', function(err, user, info) {
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

                r.set(config.server.api.auth.redis.keyPrefix + config.server.api.auth.tokens.key + ':' + token, user.id, 'EX',
                    config.server.api.auth.tokens.expireTime, function(err)  {
                        if (err) {
                            return next(err);
                        }

                        return res.json({
                            success: true,
                            message: 'User signin succeeded',
                            token: new Buffer(token).toString('base64')
                        });
                    });
            })(req, res, next);
        });
    };
}());