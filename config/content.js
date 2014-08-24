var path = require('path');

var env = process.env.NODE_ENV || 'development';

var config = {
    development: {
        root: path.normalize(__dirname + '/..'),

        pages: {
            directory: 'content/pages/',
            comments: true
        },

        posts: {
            directory: 'content/posts/',
            excerpt: '<!-- more -->',
            comments: true
        }
    }
};

module.exports = config[env];