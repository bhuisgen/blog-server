(function() {
  'use strict';

  var Schema = require('jugglingdb').Schema; // eslint-disable-line

  module.exports = function(schema) {
    var BlacklistEmail = schema.define('BlacklistEmail', {
      email: {
        type: String,
        length: 256,
        index: true
      }
    });

    BlacklistEmail.validatesPresenceOf('email');

    return BlacklistEmail;
  };
}());
