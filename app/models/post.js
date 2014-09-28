(function() {
    'use strict';

    var Schema = require('jugglingdb').Schema;

    module.exports = function(schema) {
        var Post = schema.define('Post', {
            slug: {
                type: String,
                length: 64,
                index: true
            },
            layout: {
                type: String,
                length: 64
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
            excerpt: {
                type: Schema.Text,
                default: null
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
            },
            commentsEnabled: {
                type: Boolean,
                default: true
            },
            commentsAllowed: {
                type: Boolean,
                default: true
            }
        });

        Post.belongsTo(schema.loadDefinition('User'), {
            as: 'user',
            foreignKey: 'userId'
        });

        Post.hasAndBelongsToMany(schema.loadDefinition('Term'), {
            as: 'categories',
            through: schema.loadDefinition('PostCategory')
        });

        Post.hasAndBelongsToMany(schema.loadDefinition('Term'), {
            as: 'tags',
            through: schema.loadDefinition('PostTag')
        });

        Post.hasMany(schema.loadDefinition('Comment'), {
            as: 'comments',
            foreignKey: 'postId'
        });

        Post.validatesPresenceOf('slug');
        Post.validatesPresenceOf('layout');
        Post.validatesPresenceOf('title');
        Post.validatesPresenceOf('content');

        return Post;
    };
}());