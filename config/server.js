var path = require('path');

var config = {
    root: path.normalize(__dirname + '/..'),

    host: '127.0.0.1',
    port: 3000,

    ssl: {
        enable: true,

        certificateFile: 'config/ssl/server.crt',
        keyFile: 'config/ssl/server.key'
    },

    errorLog: {
        console: {
            colorize: true,
            json: true
        }
    },

    accessLog: {
        console: true
    },

    compress: false,
    requestTimeout: 4000,

    static: {
        enable: true,

        directory: 'public'
    },

    api: {
        enable: true,

        vendor: 'hbis',
        defaultVersion: 1,

        auth: {
            redis: {
                host: '127.0.0.1',
                port: 6379,
                options: {},

                database: 0,
                keyPrefix: 'blog-server:api:'
            },

            tokens: {
                key: 'tokens',
                expireTime: 600
            },

            users: {
                key: 'users'
            },

            providers: {
                local: true,

                facebook: true,
                github: true,
                google: true,
                linkedin: true,
                openid: true,
                twitter: true
            }
        },

        maxItems: 10
    }
};

module.exports = config;
