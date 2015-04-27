var path = require('path');

var config = {
	host: '0.0.0.0',
	port: 3000,

	ssl: {
		enable: true,

		certificateFile: 'config/ssl/server.crt',
		keyFile: 'config/ssl/server.key'
	},

    errorLog: {
        console: true
    },

    accessLog: {
        console: true
    },

	root: path.normalize(__dirname + '/..'),

	publicDirectory: 'public',
	
	requestTimeout: 4000,

	api: {
		enable: true,

		vendor: 'hbis',
		defaultVersion: 1,

		auth: {
			redis: {
				host: 'localhost',
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

				facebook: false,
				github: false,
				google: false,
				linkedin: false,
				openid: false,
				twitter: false
			}
		},

		maxItems: 10
	}
};

module.exports = config;