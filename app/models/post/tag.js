(function() {
	'use strict';

	var Schema = require('jugglingdb').Schema;

	module.exports = function(schema) {
		var PostTag = schema.define('PostTag', {});

		return PostTag;
	};
}());