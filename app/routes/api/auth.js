(function() {
    'use strict';

    var crypto = require('crypto');
    var path = require('path');
    var redis = require('redis');
    var passport = require('passport');
    var uuid = require('node-uuid');

    var Schema = require('jugglingdb-model-loader');

    var LocalStrategy = require('passport-local').Strategy;
    var FacebookStrategy = require('passport-facebook').Strategy;
    var GitHubStrategy = require('passport-github').Strategy;
    var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
    var LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
    var OpenIDStrategy = require('passport-openid').Strategy;
    var TwitterStrategy = require('passport-twitter').Strategy;


    module.exports = function(config, router) {
        config.keys = require('../../../config/keys');

        var schema = new Schema(config.database.type, {
            host: config.database.host,
            port: config.database.port,
            database: config.database.name,
            modelLoader: {
                rootDirectory: path.normalize(__dirname + '/../../..'),
                directory: 'app/models'
            }
        });

        var Key = schema.loadDefinition('Key');
        var User = schema.loadDefinition('User');
        var LocalAccount = schema.loadDefinition('LocalAccount');
        var ExternAccount = schema.loadDefinition('ExternAccount');

        var r = redis.createClient(config.server.api.auth.redis.port, config.server.api.auth.redis.host);

        r.auth(config.server.api.auth.redis.password);

        r.on('connect', function() {
            if (config.server.api.auth.redis.hasOwnProperty('database')) {
                r.select(config.server.api.auth.redis.database);
            }
        });

        r.on('error', function(error) {
            console.error(error);
        });

        router.use(passport.initialize());

        router.use(function(req, res, next) {
            if (req.path.match(/^\/auth\//)) {
                return next();
            }

            var header = req.get('Authorization');
            var err;
            var ret;

            if (typeof header === 'undefined') {
                err = new Error('Authorization header not found');
                err.status = 401;

                return next(err);
            }

            ret = header.match(/^Basic (.+)$/);
            if (!ret) {
                err = new Error('Invalid authorization header');
                err.status = 401;

                return next(err);
            }

            var token = new Buffer(ret[1], 'base64').toString();

            Key.findOne({
                where: {
                    authkey: token,
                }
            }, function(err, key) {
                if (err) {
                    return next(err);
                }

                if (key) {
                    if (!key.enabled) {
                        err = new Error('Key disabled');
                        err.status = 403;

                        return next(err);
                    }

                    key.user(function(err, user) {
                        if (err) {
                            return next(err);
                        }

                        if (!user) {
                            err = new Error('User not found');
                            err.status = 401;

                            return next(err);
                        }

                        if (!user.enabled) {
                            err = new Error('User disabled');
                            err.status = 403;

                            return next(err);
                        }

                        req.user = user;

                        next();
                    });
                } else {
                    r.get(config.server.api.auth.redis.keyPrefix + config.server.api.auth.token.key + token, function(err, id) {
                        if (err) {
                            return next(err);
                        }

                        if (!id) {
                            err = new Error('Bad authorization token');
                            err.status = 401;

                            return next(err);
                        }

                        User.find(id, function(err, user) {
                            if (err) {
                                return next(err);
                            }

                            if (!user) {
                                err = new Error('User not found');
                                err.status = 401;

                                return next(err);
                            }

                            if (!user.enabled) {
                                err = new Error('User disabled');
                                err.status = 403;

                                return next(err);
                            }

                            req.user = user;

                            r.expire(config.server.api.auth.redis.keyPrefix + config.server.api.auth.token.key + token, config.server.api.auth.token.expireTime, function(err) {
                                if (err) {
                                    return next(err);
                                }

                                next();
                            });
                        });
                    });
                }
            });
        });

        router.post('/auth/signout', function(req, res, next) {
            if (!req.body.token) {
                res.status(401);

                return res.json({
                    success: false,
                    message: 'User signout failed'
                });
            }

            var token = new Buffer(req.body.token, 'base64').toString('ascii');

            r.get(config.server.api.auth.redis.keyPrefix + config.server.api.auth.token.key + token, function(err, id) {
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

                r.del(config.server.api.auth.redis.keyPrefix + config.server.api.auth.token.key + token, function(err) {
                    if (err) {
                        return next(err);
                    }

                    res.json({
                        success: true,
                        message: 'User signout succeeded'
                    });
                });
            });
        });

        /*
         * Local authentication
         */

        if (config.server.api.auth.providers.local) {

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

                        var user = new User({
                            name: req.body.name,
                            email: req.body.email
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

                                done(null, user);
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

                        done(null, user);
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
                            message: 'User already exists'
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
                                message: 'User signup succeeded',
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
        }

        /*
         * Facebook authentication
         */

        if (config.server.api.auth.providers.facebook) {
            passport.use('facebook', new FacebookStrategy({
                clientID: config.keys.auth.facebook.clientID,
                clientSecret: config.keys.auth.facebook.clientSecret,
                callbackURL: config.keys.auth.facebook.callbackURL,
                passReqToCallback: true
            }, function(req, token, refreshToken, profile, done) {
                if (!req.user) {
                    ExternAccount.findOne({
                        where: {
                            provider: 'facebook',
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
                                provider: 'facebook',
                                profileId: profile.id,
                                token: token,
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
                            provider: 'facebook',
                            profileId: profile.id
                        },
                    }, function(err, account) {
                        if (err) {
                            return done(err);
                        }

                        if (account) {
                            return done(null, false);
                        }

                        account = user.externAccounts.build({
                            provider: 'facebook',
                            profileId: profile.id,
                            token: token,
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

            router.get('/auth/facebook', function(req, res, next) {
                passport.authenticate('facebook')(req, res, next);
            });

            router.get('/auth/facebook/callback', function(req, res, next) {
                passport.authenticate('facebook', function(err, user, info) {
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
        }

        /*
         * GitHub authentication
         */

        if (config.server.api.auth.providers.github) {
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
        }

        /*
         * Google authentication
         */

        if (config.server.api.auth.providers.google) {
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
        }

        /*
         * LinkedIn authentication
         */

        if (config.server.api.auth.providers.linkedin) {
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
        }

        /*
         * OpenID authentication
         */

        if (config.server.api.auth.providers.openid) {
            passport.use('openid', new OpenIDStrategy({
                returnURL: config.keys.auth.openid.returnURL,
                realm: config.keys.auth.openid.realm,
                identifierField: 'openidIdentifier',
                passReqToCallback: true
            }, function(req, token, profile, done)  {
                console.log(token);
                console.log(profile);

                if (!req.user) {
                    ExternAccount.findOne({
                        where: {
                            provider: 'openid',
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
                                provider: 'openid',
                                profileId: profile.id,
                                token: token,
                                username: profile.username,
                                displayName: profile.displayName
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
                            provider: 'openid',
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
                            provider: 'openid',
                            profileId: profile.id,
                            token: token,
                            username: profile.username,
                            displayName: profile.displayName
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

            router.post('/auth/openid', function(req, res, next) {
                passport.authenticate('openid')(req, res, next);
            });

            router.get('/auth/openid/callback', function(req, res, next) {
                passport.authenticate('openid', function(err, user, info) {
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
        }

        /*
         * Twitter authentication
         */

        if (config.server.api.auth.providers.twitter) {
            passport.use('twitter', new TwitterStrategy({
                consumerKey: config.keys.auth.twitter.consumerKey,
                consumerSecret: config.keys.auth.twitter.consumerSecret,
                callbackURL: config.keys.auth.twitter.callbackURL,
                passReqToCallback: true
            }, function(req, token, tokenSecret, profile, done) {
                if (!req.user) {
                    ExternAccount.findOne({
                        where: {
                            provider: 'twitter',
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
                                provider: 'twitter',
                                profileId: profile.id,
                                token: token,
                                username: profile.username,
                                displayName: profile.displayName
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
                            provider: 'twitter',
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
                            provider: 'twitter',
                            profileId: profile.id,
                            token: token,
                            username: profile.username,
                            displayName: profile.displayName
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

            router.get('/auth/twitter', function(req, res, next) {
                passport.authenticate('twitter', {
                    session: false
                })(req, res, next);
            });

            router.get('/auth/twitter/callback', function(req, res, next) {
                passport.authenticate('twitter', function(err, user, info) {
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
        }
    };
}());