(function() {
    'use strict';

    var bcrypt = require('bcrypt');

    var Schema = require('jugglingdb').Schema;

    module.exports = function(schema) {
        var LocalAccount = schema.define('LocalAccount', {
            login: {
                type: String,
                length: 32,
                index: true
            },
            password: {
                type: String,
                length: 256
            }
        });

        LocalAccount.belongsTo(schema.loadDefinition('User'), {
            as: 'user',
            foreignKey: 'userId'
        });

        LocalAccount.validatesPresenceOf('login');
        LocalAccount.validatesPresenceOf('password');

        LocalAccount.prototype.hashPassword = function(password) {
            return bcrypt.hashSync(password, 10);
        };

        LocalAccount.prototype.checkPassword = function(password) {
            return bcrypt.compareSync(password, this.password);
        };
    };
}());