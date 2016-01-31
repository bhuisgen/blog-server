(function() {
  'use strict';

  var local = require('./auth/local');
  var facebook = require('./auth/facebook');
  var github = require('./auth/github');
  var google = require('./auth/google');
  var linkedin = require('./auth/linkedin');
  var openid = require('./auth/openid');
  var twitter = require('./auth/twitter');

  module.exports = function(config, router, r) {
    if (config.server.api.auth.providers.local) {
      local(config, router, r);
    }

    if (config.server.api.auth.providers.facebook) {
      facebook(config, router, r);
    }

    if (config.server.api.auth.providers.github) {
      github(config, router, r);
    }

    if (config.server.api.auth.providers.google) {
      google(config, router, r);
    }

    if (config.server.api.auth.providers.linkedin) {
      linkedin(config, router, r);
    }

    if (config.server.api.auth.providers.openid) {
      openid(config, router, r);
    }

    if (config.server.api.auth.providers.twitter) {
      twitter(config, router, r);
    }
  };
}());
