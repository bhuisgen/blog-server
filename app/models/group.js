(function() {
    'use strict';

    var Schema = require('jugglingdb').Schema;

    module.exports = function(schema) {
        var Group = schema.define('Group', {
            name: {
                type: String,
                length: 64,
                index: true
            },
            created: {
                type: Date,
                default: function() {
                    return new Date();
                },
                index: true
            },
        });

        Group.belongsTo(schema.loadDefinition('Role'), {
            as: 'role',
            foreignKey: 'roleId'
        });

        Group.hasMany(schema.loadDefinition('User'), {
            as: 'users',
            foreignKey: 'groupId'
        });

        Group.validatesPresenceOf('name');

        return Group;
    };
}());