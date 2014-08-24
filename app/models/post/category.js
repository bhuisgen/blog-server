(function() {
    'use strict';

    var Schema = require('jugglingdb').Schema;

    module.exports = function(schema) {
        var PostCategory = schema.define('PostCategory', {});

        return PostCategory;
    };
}());