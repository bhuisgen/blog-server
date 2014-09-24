var env = process.env.NODE_ENV || 'development';

var config = {
	development: {
		type: 'redis',
		options: {
			host: '127.0.0.1',
			port: 6379,
			name: 1
		}
	},

	production: {
		type: 'redis',
		options: {
			host: '127.0.0.1',
			port: 6379,
			name: 1
		}
	}
};

module.exports = config[env];