'use strict';

let extend = require('extend'),
    gutil = require('gulp-util'),
    colors = gutil.colors,
    QUnit = require('qunitjs');

// Make the QUnit api global, like it is in the browser.
extend(global, QUnit);
global.QUnit = QUnit;

// Unfortunately right now, if we want the deprecated function on QUnit e.g.
// QUnit.push(), we have to do some trickery since QUnit only exposes these if a
// window and document is around.
// TODO: Fix this in QUnit instead.
if (!QUnit.push) {
    QUnit.test('setup', function(assert) {
        assert.expect(0);
        let Assert = assert.constructor,
            proto = Object.getPrototypeOf(assert);
        Object.keys(proto).forEach(function(key) {
            let current = proto[key];
            global[key] = QUnit[key] = function() {
                current.apply(new Assert(QUnit.config.current), arguments);
            };
        });
    });
}

process.on('uncaughtException', function(err) {
    let msg = err.message,
        stack = err.stack;
    trace.forEach(item => {
        msg += '\n  ' + item.file, ':' + item.line;
    });
    if (msg) {
        system.stderr.writeLine(msg);
    }
});

// Use JSON over stdout for communication. We could use process.send(), but
// that wouldn't be available for phantomjs. By using the same approach we
// can simplify code a lot.
function send(message) {
    system.stdout.writeLine(JSON.stringify(message));
}

QUnit.log(function(data) {
    // Ignore passing assertions
    if (!data.result) {
        process.send({ type: 'log', data: data });
    }
});

QUnit.done(function(data) {
    process.send({ type: 'done', data: data });
});

// Require all the modules needed for the test to be present.
function requirePath(entry, addToGlobal) {
    if (typeof entry === 'string')
        entry = { path: entry };
    let exports = require(entry.path);
    if (addToGlobal) {
        if (entry.namespace) {
            global[entry.namespace] = exports;
        } else {
            extend(global, exports);
        }
    }
}

let options = JSON.parse(process.argv.pop());

(options.require || []).forEach(function(path) {
    requirePath(path, true);
});

requirePath(options.file, true);

QUnit.load();
