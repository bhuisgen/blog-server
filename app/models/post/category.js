(function() {
  'use strict';

  var Schema = require('jugglingdb').Schema; // eslint-disable-line

  module.exports = function(schema) {
    var PostCategory = schema.define('PostCategory', {});

    return PostCategory;
  };
}());
