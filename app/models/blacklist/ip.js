(function() {
  'use strict';

  var Schema = require('jugglingdb').Schema; // eslint-disable-line

  module.exports = function(schema) {
    var BlacklistIP = schema.define('BlacklistIp', {
      ip: {
        type: String,
        length: 46,
        index: true
      }
    });

    BlacklistIP.validatesPresenceOf('ip');

    return BlacklistIP;
  };
}());
