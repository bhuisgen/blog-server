(function() {
    'use strict';

    var Schema = require('jugglingdb').Schema;

    module.exports = function(schema) {
        var Role = schema.define('Role', {
            name: {
                type: String,
                length: 256,
                index: true
            },
            rolesCreate: {
                type: Boolean,
                default: false
            },
            rolesRead: {
                type: Boolean,
                default: false
            },
            rolesUpdate: {
                type: Boolean,
                default: false
            },
            rolesDelete: {
                type: Boolean,
                default: false
            },
            groupsCreate: {
                type: Boolean,
                default: false
            },
            groupsRead: {
                type: Boolean,
                default: false
            },
            groupsUpdate: {
                type: Boolean,
                default: false
            },
            groupsDelete: {
                type: Boolean,
                default: false
            },
            usersCreate: {
                type: Boolean,
                default: false
            },
            usersRead: {
                type: Boolean,
                default: false
            },
            usersUpdate: {
                type: Boolean,
                default: false
            },
            usersDelete: {
                type: Boolean,
                default: false
            },
            keysCreate: {
                type: Boolean,
                default: false
            },
            keysRead: {
                type: Boolean,
                default: false
            },
            keysUpdate: {
                type: Boolean,
                default: false
            },
            keysDelete: {
                type: Boolean,
                default: false
            },
            localAccountsCreate: {
                type: Boolean,
                default: false
            },
            localAccountsRead: {
                type: Boolean,
                default: false
            },
            localAccountsUpdate: {
                type: Boolean,
                default: false
            },
            localAccountsDelete: {
                type: Boolean,
                default: false
            },
            externAccountsCreate: {
                type: Boolean,
                default: false
            },
            externAccountsRead: {
                type: Boolean,
                default: false
            },
            externAccountsUpdate: {
                type: Boolean,
                default: false
            },
            externAccountsDelete: {
                type: Boolean,
                default: false
            },
            pagesCreate: {
                type: Boolean,
                default: false,
            },
            pagesRead: {
                type: Boolean,
                default: false
            },
            pagesUpdate: {
                type: Boolean,
                default: false
            },
            pagesDelete: {
                type: Boolean,
                default: false
            },
            postsCreate: {
                type: Boolean,
                default: false
            },
            postsRead: {
                type: Boolean,
                default: false
            },
            postsUpdate: {
                type: Boolean,
                default: false
            },
            postsDelete: {
                type: Boolean,
                default: false
            },
            commentsCreate: {
                type: Boolean,
                default: false
            },
            commentsRead: {
                type: Boolean,
                default: false
            },
            commentsUpdate: {
                type: Boolean,
                default: false
            },
            commentsDelete: {
                type: Boolean,
                default: false
            }
        });

        Role.hasMany(schema.loadDefinition('Group'), {
            as: 'groups',
            foreignKey: 'roleId'
        });

        Role.validatesPresenceOf('name');

        return Role;
    };
}());