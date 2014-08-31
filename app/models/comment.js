(function() {
    'use strict';

    var Schema = require('jugglingdb').Schema;

    module.exports = function(schema) {
        var Comment = schema.define('Comment', {
            content: {
                type: Schema.Text
            },
            author: {
                type: String,
                length: 64,
                index: true
            },
            email: {
                type: String,
                length: 256,
                index: true
            },
            ip: {
                type: String,
                length: 48
            },
            created: {
                type: Date,
                default: function() {
                    return new Date();
                },
                index: true
            },
            validated: {
                type: Boolean,
                default: false,
                index: true
            },
            allowed: {
                type: Boolean,
                default: false,
                index: true
            }
        });

        Comment.belongsTo(schema.loadDefinition('Post'), {
            as: 'post',
            foreignKey: 'postId'
        });

        Comment.belongsTo(schema.loadDefinition('User'), {
            as: 'user',
            foreignKey: 'userId'
        });

        Comment.validatesPresenceOf('content');
        Comment.validatesPresenceOf('author');
        Comment.validatesPresenceOf('email');
        Comment.validatesPresenceOf('ip');

        return Comment;
    };
}());