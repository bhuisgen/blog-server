var path = require('path');

var env = process.env.NODE_ENV || 'development';

var config = {
	development: {
		host: '127.0.0.1',
		port: 3001,

		ssl: {
			engine: true,
			certificateFile: 'config/ssl/localhost.crt',
			keyFile: 'config/ssl/localhost.key'
		},

		root: path.normalize(__dirname + '/..'),

		publicDirectory: 'public',

		responseTimeout: 4000,

		status: true,

		api: {
			vendor: 'hbis',
			defaultVersion: 1,

			auth: {
				redis: {
					host: 'localhost',
					port: 6379,
					database: 0,
					keyPrefix: 'blog-server:api:'
				},

				token: {
					key: 'token:',
					expireTime: 600
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
	}
};

module.exports = config[env];