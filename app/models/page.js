(function() {
    'use strict';

    var Schema = require('jugglingdb').Schema;

    module.exports = function(schema) {
        var Page = schema.define('Page', {
            slug: {
                type: String,
                length: 64,
                index: true
            },
            layout: {
                type: String,
                length: 256
            },
            title: {
                type: String,
                length: 256
            },
            image: {
                type: String,
                length: 1024,
                default: null
            },
            content: {
                type: Schema.Text
            },
            created: {
                type: Date,
                default: function() {
                    return new Date();
                },
                index: true
            },
            published: {
                type: Boolean,
                default: false,
                index: true
            }
        });

        Page.belongsTo(schema.loadDefinition('User'), {
            as: 'user',
            foreignKey: 'userId'
        });

        Page.validatesPresenceOf('slug');
        Page.validatesPresenceOf('layout');
        Page.validatesPresenceOf('title');
        Page.validatesPresenceOf('content');

        return Page;
    };
}());