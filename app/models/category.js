(function() {
  'use strict';

  var Schema = require('jugglingdb').Schema; // eslint-disable-line

  module.exports = function(schema) {
    var Category = schema.define('Category', {
      name: {
        type: String,
        length: 256,
        index: true
      }
    });

    Category.validatesPresenceOf('name');

    return Category;
  };
}());
