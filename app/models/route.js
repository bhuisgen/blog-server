(function() {
    'use strict';

    var Schema = require('jugglingdb').Schema;

    module.exports = function(schema) {
        var Route = schema.define('Route', {
            name: {
                type: String,
                length: 64,
                index: true
            },
        });

        Route.belongsTo(schema.loadDefinition('Permission'), {
            as: 'permission',
            foreignKey: 'permissionId'
        });

        Route.validatesPresenceOf('name');

        return Route;
    };
}());