var path = require('path'),
    childProcess = require('child_process'),
    extend = require('extend'),
    gutil = require('gulp-util'),
    through = require('through2'),
    phantomjs = require('phantomjs'),
    colors = gutil.colors;

var pluginName = 'gulp-qunits',
    lineBreaks = /\r\n|\n|\r/mg;

function reportDone(data) {
    if (data.failures) {
        data.failures.forEach(function(fail) {
            reportFail(fail);
        });
    }
    var color = data.failed > 0 ? colors.red : colors.green;
    gutil.log('Took ' + data.runtime + ' ms to run ' +
            colors.blue(data.total) + ' tests. ' +
            color(data.passed + ' passed, ' +
                data.failed + ' failed.'));
}

function reportFail(data) {
    console.log(data);
    var lines = [
        colors.red('Test failed') + ': ' + data.module + ': '
                + data.name
    ];
    var line = 'Failed assertion: ' + (data.message || '');
    if (data.expected !== undefined) {
        line += ', expected: ' + data.expected + ', but was: '
                + data.actual;
    }
    lines.push(line);
    if (data.source) {
        lines.push.apply(lines, data.source.split(lineBreaks));
    }
    lines.forEach(function(line) {
        gutil.log(line);
    });
}

function convertPaths(file, paths) {
    if (paths) {
        var res = [];
        (Array.isArray(paths) ? paths : [paths]).forEach(function(entry) {
            if (typeof entry === 'string') {
                entry = { path: entry };
            }
            entry.path = path.resolve(path.resolve(process.cwd(),
                    // Distinguish between paths relative to the file's cwd,
                    // and absolute modules, for which we need to resolve the
                    // node_modules folder as the process is running in a fork.
                    /^[.]/.test(entry.path) ? file.cwd : 'node_modules'),
                    entry.path);
            res.push(entry);
        });
        return res;
    }
}

function runNode(file, options, callback) {
    options.require = convertPaths(file, options.require);
    options.file = file.path;
    var argv = process.argv.slice();
    argv.push(JSON.stringify(options));
    var childPath = __dirname + '/lib/node-runner',
        child = childProcess.fork(childPath, argv, {
            env: process.env,
            cwd: file.cwd
        }),
        timeoutId;

    function kill() {
        process.removeListener('exit', kill);
        child.kill();
    }

    child.on('message', function(message) {
        switch (message.type) {
            case 'ping':
                clearTimeout(timeoutId);
                timeoutId = setTimeout(function() {
                    complete(new Error('Process blocked for too long'));
                }, options.timeout * 1000);
                break;
            case 'fail':
                reportFail(message.data);
                clearTimeout(timeoutId);
                break;
            case 'done':
                reportDone(message.data);
                clearTimeout(timeoutId);
                var passed = !message.data.failed;
                callback(!passed && 'QUnit assertions failed', file);
                kill();
                break;
            case 'error':
                this.emit('error', new gutil.PluginError(pluginName,
                        message.data));
                break;
        }
    }.bind(this));

    process.on('exit', kill);
}

function runPhantom(file, options, callback) {
    var phantomPath = options.phantomPath || options.binPath || phantomjs.path,
        absolutePath = path.resolve(file.path),
        isAbsolutePath = absolutePath.indexOf(file.path) >= 0,
        resolvedPath = isAbsolutePath ? 'file:///' +
            absolutePath.replace(/\\/g, '/') : file.path;
        queryOptions = ['noGlobals', 'noTryCatch'],
        queryParams = [],
        args = [];

    queryOptions.forEach(function(option) {
        if (options[option])
            queryParams.push(option.toLowerCase());
    });
    queryParams = queryParams.length ? '?' + queryParams.join('&') : '';

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

    childProcess.execFile(phantomPath, args, function (err, stdout, stderr) {
        if (stdout) {
            stdout.trim().split(lineBreaks).forEach(function (line) {
                line = line.trim();
                if (/^\{/.test(line)) {
                    reportDone(JSON.parse(line));
                } else {
                    gutil.log(line);
                }
            });
        }
        if (stderr) {
            err = stderr;
        }
        return callback(err, file);
    });
}

module.exports = function (params) {
    var options = extend({
        timeout: 5
    }, params);

    return through.obj(function (file, encoding, callback) {
        if (file.isStream()) {
            this.emit('error', new gutil.PluginError(pluginName,
                    'Streaming not supported'));
            return callback();
        }
        var fileTitle = colors.blue(file.relative),
            phantom = /\.html$/.test(file.path);
        gutil.log('Testing ' + fileTitle + ' in ' +
                colors.cyan(phantom ? 'PhantomJS' : 'Node.js'));
        var run = phantom ? runPhantom : runNode;
        run.call(this, file, options, function(err, file) {
            if (err) {
                gutil.log(pluginName + ': ' + colors.red('✖ ') +
                    'QUnit assertions failed in ' + fileTitle);
            } else {
                gutil.log(pluginName + ': ' + colors.green('✔ ') +
                    'QUnit assertions all passed in ' + fileTitle);
            }
            this.emit(pluginName + '.finished', { 'passed': !err });
            callback(err && new gutil.PluginError(pluginName, err), file);
        }.bind(this));
    });
};
