(function() {
    'use strict';

    var Schema = require('jugglingdb').Schema;

    module.exports = function(schema) {
        var User = schema.define('User', {
            email: {
                type: String,
                length: 256,
                index: true
            },
            name: {
                type: String,
                length: 256
            },
            created: {
                type: Date,
                default: function() {
                    return new Date();
                },
                index: true
            },
            enabled: {
                type: Boolean,
                default: false
            }
        });

        User.belongsTo(schema.loadDefinition('Group'), {
            as: 'group',
            foreignKey: 'groupId'
        });

        User.hasMany(schema.loadDefinition('Key'), {
            as: 'keys',
            foreignKey: 'userId'
        });

        User.hasMany(schema.loadDefinition('LocalAccount'), {
            as: 'localAccounts',
            foreignKey: 'userId'
        });

        User.hasMany(schema.loadDefinition('ExternAccount'), {
            as: 'externAccounts',
            foreignKey: 'userId'
        });

        User.hasMany(schema.loadDefinition('Page'), {
            as: 'pages',
            foreignKey: 'userId'
        });

        User.hasMany(schema.loadDefinition('Post'), {
            as: 'posts',
            foreignKey: 'userId'
        });

        User.hasMany(schema.loadDefinition('Comment'), {
            as: 'comments',
            foreignKey: 'userId'
        });

        User.validatesPresenceOf('email');
        User.validatesPresenceOf('name');
        User.validatesPresenceOf('group');

        return User;
    };
}());