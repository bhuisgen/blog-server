(function() {
    'use strict';

    var Schema = require('jugglingdb').Schema;

    module.exports = function(schema) {
        var Term = schema.define('Term', {
            name: {
                type: String,
                length: 256,
                index: true
            }
        });

        Term.belongsTo(schema.loadDefinition('Taxonomy'), {
            as: 'taxonomy',
            foreignKey: 'taxonomyId'
        });

        Term.validatesPresenceOf('name');

        return Term;
    };
}());