(function() {
  'use strict';

  var Schema = require('jugglingdb').Schema; // eslint-disable-line

  module.exports = function(schema) {
    var PostTag = schema.define('PostTag', {});

    return PostTag;
  };
}());
