'use strict';

var request = require('request');

module.exports = function(grunt) {
    require('time-grunt')(grunt);
    require('load-grunt-tasks')(grunt);

    var reloadPort = 30000,
        files;

    var gruntConfig = {
        app: 'app',
        bin: 'bin',
        config: 'config'
    };

    grunt.initConfig({
        grunt: gruntConfig,
        pkg: grunt.file.readJSON('package.json'),
        develop: {
            release: {
                file: 'bin/server'
            },
            debug: {
                file: 'bin/server',
                nodeArgs: ['--debug-brk']
            }
        },
        watch: {
            options: {
                nospawn: true,
                livereload: reloadPort
            },
            server: {
                files: [
                    'bin/server',
                    'config/*.js',
                    'app/*.js',
                    'app/**/*.js'
                ],
                tasks: ['develop', 'delayed-livereload']
            },
            serverdebug: {
                files: [
                    'bin/server',
                    'config/*.js',
                    'app/*.js',
                    'app/**/*.js'
                ],
                tasks: ['develop', 'delayed-livereload']
            }
        },
        jshint: {
            options: {
                jshintrc: '.jshintrc',
                reporter: require('jshint-stylish')
            },
            all: [
                'Gruntfile.js',
                '<%= grunt.app %>/{,*/}*.js',
                '<%= grunt.bin %>/{,*/}*',
                '<%= grunt.config %>/{,*/}*.js',
            ]
        }
    });

    grunt.config.requires('watch.server.files');
    files = grunt.config('watch.server.files');
    files = grunt.file.expand(files);

    grunt.registerTask('delayed-livereload', 'Live reload after the node server has restarted.', function() {
        var done = this.async();
        setTimeout(function() {
            request.get('http://localhost:' + reloadPort + '/changed?files=' + files.join(','), function(err, res) {
                var reloaded = !err && res.statusCode === 200;
                if (reloaded) {
                    grunt.log.ok('Delayed live reload successful.');
                } else {
                    grunt.log.error('Unable to make a delayed live reload.');
                }
                done(reloaded);
            });
        }, 500);
    });

    grunt.registerTask('lint', [
        'jshint'
    ]);

    grunt.registerTask('serve', function() {
        grunt.task.run([
            'develop:release',
            'watch'
        ]);
    });

    grunt.registerTask('serve-debug', function() {
        grunt.task.run([
            'develop:debug',
            'watch'
        ]);
    });

    grunt.registerTask('default', [
        'build'
    ]);
};