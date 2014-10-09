(function() {
    'use strict';

    var path = require('path');
    var passport = require('passport');
    var uuid = require('node-uuid');

    var Schema = require('jugglingdb-model-loader');

    var LocalStrategy = require('passport-local').Strategy;

    module.exports = function(config, router, r) {
        var options = config.database.options;

        options.modelLoader = {
            rootDirectory: path.normalize(__dirname + '/../../../..'),
            directory: 'app/models'
        };

        var schema = new Schema(config.database.type, options);

        var User = schema.loadDefinition('User');
        var LocalAccount = schema.loadDefinition('LocalAccount');

        router.use(passport.initialize());

        passport.use('local-signup', new LocalStrategy({
            usernameField: 'login',
            passwordField: 'password',
            passReqToCallback: true
        }, function(req, login, password, done) {
            if (!req.body.name) {
                return done(new Error('Missing user name'));
            }

            if (!req.body.email) {
                return done(new Error('Missing user email address'));
            }

            User.findOne({
                where: {
                    email: req.body.email
                }
            }, function(err, user) {
                if (err) {
                    return done(err);
                }

                if (user) {
                    return done(null, false);
                }

                LocalAccount.findOne({
                    where: {
                        login: login
                    },
                }, function(err, account) {
                    if (err) {
                        return done(err);
                    }

                    if (account) {
                        return done(null, false);
                    }

                    user = new User({
                        name: req.body.name,
                        email: req.body.email,
                        lastLogin: new Date()
                    });

                    user.save(function(err) {
                        if (err) {
                            return done(err);
                        }

                        account = user.localAccounts.build({
                            login: login
                        });

                        account.password = account.hashPassword(password);

                        account.save(function(err) {
                            if (err) {
                                return done(err);
                            }

                            return done(null, user);
                        });
                    });
                });
            });
        }));

        passport.use('local-signin', new LocalStrategy({
            usernameField: 'login',
            passwordField: 'password'
        }, function(login, password, done) {
            LocalAccount.findOne({
                where: {
                    login: login
                },
            }, function(err, account) {
                if (err) {
                    return done(err);
                }

                if (!account) {
                    return done(null, false);
                }

                if (!account.checkPassword(password)) {
                    return done(null, false);
                }

                User.find(account.user(), function(err, user) {
                    if (!user) {
                        return done(null, false);
                    }

                    if (!user.enabled) {
                        return done(null, false);
                    }

                    user.updateAttribute('lastLogin', new Date(), function(err) {
                        if (err) {
                            return done(null, false);
                        }

                        return done(null, user);
                    });
                });
            });
        }));

        router.post('/auth/local/signup', function(req, res, next) {
            passport.authenticate('local-signup', function(err, user, info) {
                if (err) {
                    return next(err);
                }

                if (!user) {
                    res.status(403);

                    return res.json({
                        success: false,
                        message: 'Forbidden'
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
                            message: 'OK',
                            token: new Buffer(token).toString('base64')
                        });
                    });
            })(req, res, next);
        });

        router.post('/auth/local/signin', function(req, res, next) {
            passport.authenticate('local-signin', function(err, user, info) {
                if (err) {
                    return next(err);
                }

                if (!user) {
                    res.status(401);

                    return res.json({
                        success: false,
                        message: 'Unauthorized'
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
                            message: 'OK',
                            token: new Buffer(token).toString('base64')
                        });
                    });
            })(req, res, next);
        });
    };
}());