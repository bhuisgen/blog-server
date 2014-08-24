var env = process.env.NODE_ENV || 'development';

var config = {
    development: {
        auth: {
            facebook: {
                clientID: '123456',
                clientSecret: 'secret',
                callbackURL: 'https://127.0.0.1:3002/api/auth/facebook/callback'
            },
            github: {
                clientID: '123456',
                clientSecret: 'secret',
                callbackURL: 'https://127.0.0.1:3000/api/auth/github/callback'
            },
            google: {
                clientID: '123456',
                clientSecret: 'secret',
                callbackURL: 'https://127.0.0.1:3000/api/auth/google/callback'
            },
            linkedin: {
                clientID: '123456',
                clientSecret: 'secret',
                callbackURL: 'https://127.0.0.1:3000/api/auth/linkedin/callback'
            },
            openid: {
                returnURL: 'https://127.0.0.1:3000/api/auth/openid/callback',
                realm: 'https://127.0.0.1:3000',
            },
            twitter: {
                consumerKey: '123456',
                consumerSecret: 'secret',
                callbackURL: 'https://127.0.0.1:3000/api/auth/twitter/callback'
            }
        }
    }
};

module.exports = config[env];