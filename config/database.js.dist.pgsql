var env = process.env.NODE_ENV || 'development';

var config = {
  development: {
    type: 'postgres',
    options: {
      database: 'blog_development',
      username: 'blog',
      password: 'blog'
    }
  },

  production: {
    type: 'postgres',
    options: {
      database: 'blog_production',
      username: 'blog',
      password: 'blog'
    }
  }
};

module.exports = config[env];
