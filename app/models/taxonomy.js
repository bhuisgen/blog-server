(function() {
    'use strict';

    var Schema = require('jugglingdb').Schema;

    module.exports = function(schema) {
        var Taxonomy = schema.define('Taxonomy', {
            name: {
                type: String,
                length: 256,
                index: true
            }
        });

        Taxonomy.hasMany(schema.loadDefinition('Term'), {
            as: 'terms',
            foreignKey: 'taxonomyId'
        });

        Taxonomy.validatesPresenceOf('name');

        return Taxonomy;
    };
}());