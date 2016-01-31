var path = require('path');

var config = {
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
};

module.exports = config;
