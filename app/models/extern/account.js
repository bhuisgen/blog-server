(function() {
    'use strict';

    var Schema = require('jugglingdb').Schema;

    module.exports = function(schema) {
        var ExternAccount = schema.define('ExternAccount', {
            provider: {
                type: String,
                length: 64,
                index: true
            },
            profileId: {
                type: String,
                length: 256,
                index: true
            },
            token: {
                type: String,
                length: 256
            },
            username: {
                type: String,
                length: 256,
                index: true
            },
            displayName: {
                type: String,
                length: 256,
                index: true
            },
            email: {
                type: String,
                length: 256,
                index: true
            }
        });

        ExternAccount.belongsTo(schema.loadDefinition('User'), {
            as: 'user',
            foreignKey: 'userId'
        });

        ExternAccount.validatesPresenceOf('provider');
        ExternAccount.validatesPresenceOf('profileId');
        ExternAccount.validatesPresenceOf('token');

        return ExternAccount;
    };
}());