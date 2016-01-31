(function() {
  'use strict';

  var Schema = require('jugglingdb').Schema; // eslint-disable-line

  module.exports = function(schema) {
    var Tag = schema.define('Tag', {
      name: {
        type: String,
        length: 256,
        index: true
      }
    });

    Tag.validatesPresenceOf('name');

    return Tag;
  };
}());
