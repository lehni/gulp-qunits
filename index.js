var path = require('path'),
    childProcess = require('child_process'),
    gutil = require('gulp-util'),
    through = require('through2'),
    phantomjs = require('phantomjs'),
    colors = gutil.colors;

var pluginName = 'gulp-qunits',
    lineBreaks = /\r\n|\n|\r/mg;

function reportDone(details) {
    var result = details.result,
        exceptions = details.exceptions,
        color = result.failed > 0 ? colors.red : colors.green;

    gutil.log('Took ' + result.runtime + ' ms to run ' +
            colors.blue(result.total) + ' tests. ' +
            color(result.passed + ' passed, ' +
                result.failed + ' failed.'));

    if (exceptions) {
        exceptions.forEach(function(exception) {
            reportException(exception);
        });
    }
}

function reportException(details) {
    var lines = [
        colors.red('Test failed') + ': ' + details.module + ': '
                + details.name
    ];
    var line = 'Failed assertion: ' + (details.message || '');
    if (details.expected !== undefined) {
        line += ', expected: ' + details.expected + ', but was: '
                + details.actual;
    }
    lines.push(line);
    if (details.source) {
        lines.push.apply(lines, details.source.split(lineBreaks));
    }
    lines.forEach(function(line) {
        gutil.log(line);
    });
}

module.exports = function (params) {
    var options = params || {},
        processPath = options.processPath || options.binPath || phantomjs.path,
        queryOptions = ['noGlobals', 'noTryCatch'],
        queryParams = [];
    queryOptions.forEach(function(option) {
        if (options[option])
            queryParams.push(option.toLowerCase());
    });
    queryParams = queryParams.length ? '?' + queryParams.join('&') : '';

    return through.obj(function (file, encoding, callback) {
        if (file.isStream()) {
            this.emit('error', new gutil.PluginError(pluginName,
                    'Streaming not supported'));
            return callback();
        }

        var fileTitle = colors.blue(file.relative),
            absolutePath = path.resolve(file.path),
            isAbsolutePath = absolutePath.indexOf(file.path) >= 0,
            resolvedPath = isAbsolutePath ? 'file:///' +
                absolutePath.replace(/\\/g, '/') : file.path;
            args = [];

        // Keep backward compatibility to phantomjs-options options:
        var processOtions = options.processOtions || options['phantomjs-options'];
        if (processOtions && processOtions.length) {
            args.push(processOtions);
        }
        args.push(require.resolve('./lib/phantomjs-runner'),
                resolvedPath + queryParams);
        if (options.timeout) {
            args.push(options.timeout);
        }

        childProcess.execFile(processPath, args, function (err, stdout, stderr) {
            var passed = true;
            gutil.log('Testing ' + fileTitle);
            if (stdout) {
                try {
                    stdout.trim().split(lineBreaks).forEach(function (line) {
                        line = line.trim();
                        if (/^\{/.test(line)) {
                            reportDone(JSON.parse(line));
                        } else {
                            gutil.log(line);
                        }
                    });
                } catch (e) {
                    this.emit('error', new gutil.PluginError(pluginName, e));
                }
            }

            if (stderr) {
                gutil.log(stderr);
                this.emit('error', new gutil.PluginError(pluginName, stderr));
                passed = false;
            }

            if (err) {
                gutil.log(pluginName + ': ' + colors.red('✖ ') +
                    'QUnit assertions failed in ' + fileTitle);
                this.emit('error', new gutil.PluginError(pluginName, err));
                passed = false;
            } else {
                gutil.log(pluginName + ': ' + colors.green('✔ ') +
                    'QUnit assertions all passed in ' + fileTitle);
            }

            this.emit(pluginName + '.finished', { 'passed': passed });

            return callback(null, file);
        }.bind(this));
    });
};
