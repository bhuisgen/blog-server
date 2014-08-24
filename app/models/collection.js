(function() {
    'use strict';

    var Schema = require('jugglingdb').Schema;

    module.exports = function(schema) {
        var Collection = schema.define('Collection', {
            name: {
                type: String,
                length: 64,
                index: true
            },
        });

        Collection.belongsTo(schema.loadDefinition('Permission'), {
            as: 'permission',
            foreignKey: 'permissionId'
        });

        Collection.validatesPresenceOf('name');

        return Collection;
    };
}());