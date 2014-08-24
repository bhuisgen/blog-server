(function() {
    'use strict';

    var PERMISSION = {
        SHARED: 1,
        PRIVATE: 2,
        READONLY: 3,
        FULL: 4
    };
    module.exports.PERMISSION = PERMISSION;

    var PERMISSION_DESCRIPTION = {
        '1': 'shared',
        '2': 'private',
        '3': 'read only',
        '4': 'full'
    };
    module.exports.PERMISSION_DESCRIPTION = PERMISSION_DESCRIPTION;
}());