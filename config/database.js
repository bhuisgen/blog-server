var env = process.env.NODE_ENV || 'development';

var config = {
    development: {
        type: 'redis',
        host: '127.0.0.1',
        port: 6379,
        name: 0
    }
};

module.exports = config[env];