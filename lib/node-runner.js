var extend = require('extend'),
    gutil = require('gulp-util'),
    path = require('path'),
    colors = gutil.colors;

var options = JSON.parse(process.argv.pop()),
    currentModule,
    currentTest;

// Send regular pings, but only if the child is not blocked so the parent can
// stop this process if there is a timeout.
setInterval(function() {
    process.send({ type: 'ping' });
}, options.timeout * 1000 / 2);

process.on('uncaughtException', function(err) {
    process.send({
        type: 'error',
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
// TODO: Fix this in QUnit instead.
QUnit.test('setup', function(assert) {
    var Assert = assert.constructor,
        asserts = Object.getPrototypeOf(assert);
    Object.keys(asserts).forEach(function(key) {
        var current = asserts[key];
        global[key] = QUnit[key] = function() {
            current.apply(new Assert(QUnit.config.current), arguments);
        };
    });
    assert.expect(0);
});

QUnit.log(function(data) {
    if (!data.result) {
        process.send({ type: 'fail', data: data });
    }
});

QUnit.done(function(data) {
    process.send({ type: 'done', data: data });
}, 1000);

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
