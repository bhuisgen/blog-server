(function() {
  'use strict';

  var uuid = require('node-uuid');

  var Schema = require('jugglingdb').Schema; // eslint-disable-line

  module.exports = function(schema) {
    var Key = schema.define('Key', {
      authKey: {
        type: String,
        length: 256,
        default: function() {
          return uuid.v4();
        },
        index: true
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

    Key.belongsTo(schema.loadDefinition('User'), {
      as: 'user',
      foreignKey: 'userId'
    });

    Key.validatesPresenceOf('authKey');

    return Key;
  };
}());
