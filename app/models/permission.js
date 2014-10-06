(function() {
    'use strict';

    var Schema = require('jugglingdb').Schema;

    var Define = require('../define');

    module.exports = function(schema) {
        var Permission = schema.define('Permission', {
            level: {
                type: Number,
                default: Define.PERMISSION.SHARED
            }
        });

        Permission.hasMany(schema.loadDefinition('Route'), {
            as: 'routes',
            foreignKey: 'permissionId'
        });

        Permission.prototype.isShared = function() {
            return (this.level === Define.PERMISSION.SHARED ? true : false);
        };

        Permission.prototype.isPrivate = function() {
            return (this.level === Define.PERMISSION.PRIVATE ? true : false);
        };

        Permission.prototype.isReadOnly = function() {
            return (this.level === Define.PERMISSION.READONLY ? true : false);
        };

        Permission.prototype.isFull = function() {
            return (this.level === Define.PERMISSION.FULL ? true : false);
        };

        Permission.prototype.getDescription = function() {
            return Define.PERMISSION_DESCRIPTION[this.level];
        };

        return Permission;
    };
}());