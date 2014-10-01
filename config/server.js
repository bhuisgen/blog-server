var path = require('path');

var config = {
	host: '127.0.0.1',
	port: 3000,

	ssl: {
		enable: true,

		certificateFile: 'config/ssl/localhost.crt',
		keyFile: 'config/ssl/localhost.key'
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
				socket: '/var/run/redis/redis.sock',
				//host: 'localhost',
				//port: 6379,
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