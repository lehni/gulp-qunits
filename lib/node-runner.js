var extend = require('extend'),
    gutil = require('gulp-util'),
    path = require('path'),
    colors = gutil.colors;
    // trace = require('tracejs').trace;

var options = JSON.parse(process.argv.pop()),
    currentModule,
    currentTest;

// Send ping messages to when child is blocked. After the first ping is sent,
// the runner will start to expect the next ping within timeout duration,
// otherwise this process will be killed.
process.send({ event: 'ping' });
setInterval(function() {
    process.send({ event: 'ping' });
}, options.timeout * 1000 / 2);

process.on('uncaughtException', function(err) {
    process.send({
        event: 'error',
        data: {
            message: err.message,
            stack: err.stack
        }
    });
});

// Make the QUnit api global, like it is in the browser.
var QUnit = require('qunitjs');
extend(global, QUnit);
global.QUnit = QUnit;

// Unfortunately right now, if we want the deprecated function on QUnit
// e.g. QUnit.push(), we have to do some trickery since QUnit only exposes these
// if a window and document is around.
// TODO: Address this in QUnit instead.
QUnit.test('setup', function(assert) {
    var Assert = assert.constructor,
        asserts = Object.getPrototypeOf(assert);
    Object.keys(asserts).forEach(function(key) {
        var current = asserts[key];
        QUnit[key] = function() {
            current.apply(new Assert(QUnit.config.current), arguments);
        };
    });
    assert.expect(0);
});

QUnit.log(function(data) {
    if (!data.result) {
        process.send({
            type: 'fail',
            data: data
        });
    }
});

var done = false;
QUnit.done(function(data) {
    if (done)
        return;
    /*
    var color = colors[data.failed > 0 ? 'red' : 'green'];
    gutil.log('Took ' + data.runtime + 'ms to run '
        + colors.blue(data.total) + ' tests. ' + color(data.passed
            + ' passed, ' + data.failed + ' failed.'));
    if (data.failed > 0) {
        gutil.log('node-qunit: ' + gutil.colors.red('✖')
            + ' QUnit assertions failed');
    } else {
        gutil.log('node-qunit: ' + gutil.colors.green('✔')
            + ' QUnit assertions all passed');
    }
    */
    process.send({
        type: 'done',
        data: data
    });
    done = true;
}, 1000);

/**
 * Provide better stack traces
 */
var error = console.error;
console.error = function(obj) {
    // log full stacktrace
    if (false && obj && obj.stack) {
        obj = trace(obj);
    }

    return error.apply(this, arguments);
};

// Require all the modules needed for the test to be present.
function requirePath(entry, addToGlobal) {
    if (typeof entry === 'string')
        entry = { path: entry };
    var exports = require(entry.path);
    if (addToGlobal) {
        if (entry.namespace) {
            global[entry.namespace] = exports;
        } else {
            extend(global, exports);
        }
    }
}

(options.require || []).forEach(function(path) {
    requirePath(path, true);
});

requirePath(options.file, true);

QUnit.load();
