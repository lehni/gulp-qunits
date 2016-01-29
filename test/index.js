'use strict';

var assert = require('assert'),
    gutil = require('gulp-util'),
    path = require('path'),
    qunits = require('../index'),
    colors = gutil.colors,
    out = process.stdout.write.bind(process.stdout);

describe('gulp-qunits', function() {
    this.timeout(5000);

    it('tests should pass', function(done) {
        var stream = qunits();

        process.stdout.write = function (str) {
            //out(str);
            str = colors.stripColor(str);

            if (/10 passed. 0 failed./.test(str)) {
                assert(true);
                process.stdout.write = out;
                done();
            }
        };

        stream.write(new gutil.File({
            path: './test/fixtures/passing.html',
            contents: new Buffer('')
        }));

        stream.end();
    });

    it('tests should fail', function(done) {
        var stream = qunits();

        process.stdout.write = function (str) {
            //out(str);
            str = colors.stripColor(str);

            if (/10 passed. 1 failed./.test(str)) {
                assert(true);
                process.stdout.write = out;
                done();
            }
        };

        stream.write(new gutil.File({
            path: './test/fixtures/failing.html',
            contents: new Buffer('')
        }));

        stream.end();
    });

    it('tests should not be affected by console.log in test code', function(done) {
        var stream = qunits();

        process.stdout.write = function (str) {
            //out(str);
            str = colors.stripColor(str);

            if (/10 passed. 0 failed./.test(str)) {
                assert(true);
                process.stdout.write = out;
                done();
            }
        };

        stream.write(new gutil.File({
            path: './test/fixtures/console-log.html',
            contents: new Buffer('')
        }));

        stream.end();
    });

    it('tests should pass with options', function(done) {
        var stream = qunits({ processOptions: ['--ssl-protocol=any']});

        process.stdout.write = function (str) {
            //out(str);
            str = colors.stripColor(str);

            if (/10 passed. 0 failed./.test(str)) {
                assert(true);
                process.stdout.write = out;
                done();
            }
        };

        stream.write(new gutil.File({
            path: './test/fixtures/passing.html',
            contents: new Buffer('')
        }));

        stream.end();
    });

    it('tests should time out', function(done) {
        this.timeout(10000);

        var stream = qunits({ 'timeout': 1 });

        process.stdout.write = function (str) {
            //out(str);

            if (/The specified timeout of 1 seconds has expired. Aborting.../.test(str)) {
                assert(true);
                process.stdout.write = out;
                done();
            }
        };

        stream.on('error', function () {});

        stream.write(new gutil.File({
            path: './test/fixtures/async.html',
            contents: new Buffer('')
        }));

        stream.end();
    });

    it('tests should not run when passing --help to PhantomJS', function(done) {
        var stream = qunits({ processOptions: ['--help'] });

        process.stdout.write = function (str) {
            //out(str);

            if (/10 passed. 0 failed./.test(str)) {
                assert(false, 'No tests should run when passing --help to PhantomJS');
                process.stdout.write = out;
                done();
                return;
            }

            var lines = str.split('\n');
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                if (/.*--help.*Shows this message and quits/.test(line)) {
                    assert(true);
                    process.stdout.write = out;
                    done();
                }
            }
        };

        stream.write(new gutil.File({
            path: './test/fixtures/passing.html',
            contents: new Buffer('')
        }));

        stream.end();
    });

    it('tests should pass with absolute source paths', function(done) {
        var stream = qunits();

        process.stdout.write = function (str) {
            //out(str);
            str = colors.stripColor(str);

            if (/10 passed. 0 failed./.test(str)) {
                assert(true);
                process.stdout.write = out;
                done();
            }
        };

        stream.write(new gutil.File({
            path: path.resolve('./test/fixtures/passing.html'),
            contents: new Buffer('')
        }));

        stream.end();
    });

    it('tests should pass and emit finished event', function(done) {
        var stream = qunits();

        stream.on('gulp-qunits.done', function(data) {
            assert(data.passed, 'phantom finished with errors');
        });

        process.stdout.write = function (str) {
            //out(str);
            str = colors.stripColor(str);

            if (/10 passed. 0 failed./.test(str)) {
                assert(true);
                process.stdout.write = out;
                done();
            }
        };

        stream.write(new gutil.File({
            path: path.resolve('./test/fixtures/passing.html'),
            contents: new Buffer('')
        }));

        stream.end();
    });
});