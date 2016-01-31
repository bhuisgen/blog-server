(function() {
  'use strict';

  var Schema = require('jugglingdb').Schema; // eslint-disable-line

  module.exports = function(schema) {
    var BlacklistName = schema.define('BlacklistName', {
      name: {
        type: String,
        length: 256,
        index: true
      }
    });

    BlacklistName.validatesPresenceOf('name');

    return BlacklistName;
  };
}());
