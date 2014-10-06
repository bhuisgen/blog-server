(function() {
    'use strict';

    var uuid = require('node-uuid');

    var Schema = require('jugglingdb').Schema;

    module.exports = function(schema) {
        var Variable = schema.define('Variable', {
            name: {
                type: String,
                length: 64,
                index: true
            },
            value: {
                type: String,
                length: 1024
            }
        });

        Variable.validatesPresenceOf('name');
        Variable.validatesPresenceOf('value');

        Variable.get = function(name, callback) {
            Variable.findOne({
                where: {
                    name: name
                }
            }, function(err, variable) {
                if (err) {
                    return callback(err);
                }

                if (!variable) {
                    return callback(null, null);
                } else {
                    return callback(null, variable.value);
                }
            });
        };

        Variable.set = function(name, value, callback) {
            Variable.findOne({
                where: {
                    name: name
                }
            }, function(err, variable) {
                if (err) {
                    return callback(err);
                }

                if (variable) {
                    variable.updateAttribute('value', value, function(err) {
                        if (err) {
                            return callback(err);
                        }

                        return callback(null);
                    });
                } else {
                    variable = new Variable({
                        name: name,
                        value: value
                    });

                    variable.save(function(err) {
                        if (err) {
                            return callback(err);
                        }

                        return callback(null, variable.value);
                    });
                }
            });
        };

        return Variable;
    };
}());