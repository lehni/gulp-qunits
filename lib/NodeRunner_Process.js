'use strict';

let extend = require('extend'),
    gutil = require('gulp-util'),
    colors = gutil.colors,
    QUnit = require('qunitjs');

// Make the QUnit API global, like it is in the browser.
extend(global, QUnit);
global.QUnit = QUnit;

process.on('uncaughtException', function(err) {
    let msg = err.message,
        stack = err.stack;
    if (Array.isArray(stack)) {
        stack.forEach(entry => {
            msg += '\n    at ' + entry.file + ':' + entry.line;
        });
    } else if (stack) {
        msg += stack;
    }
    if (msg) {
        process.send({ type: 'error', data: msg });
    }
});

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
