'use strict';

var page = require('webpage').create(),
    system = require('system'),
    url = require('system').args[1];

if (!url) {
    phantom.exit(1);
}

page.onError = function(msg, stack) {
    if (Array.isArray(stack)) {
        stack.forEach(function(entry) {
            if (entry.file)
                msg += '\n    at ' + entry.file + ':' + entry.line;
        });
    } else if (stack) {
        msg += stack;
    }
    if (msg) {
        system.stderr.writeLine(msg);
    }
};

page.onConsoleMessage = function () {
    // Simply route messages through:
    var msg = Array.prototype.join.call(arguments, ' ');
    if (msg) {
        system.stdout.writeLine(msg);
    }
};

page.onCallback = function (message) {
    system.stdout.writeLine(JSON.stringify(message));
};

page.onInitialized = function () {
    page.evaluate(function initialize() {
        window.document.addEventListener('DOMContentLoaded', function () {
            if (!window.QUnit) {
                throw 'QUnit does not appear to be loaded.';
            }
            QUnit.log(function(data) {
                // Ignore passing assertions
                if (!data.result) {
                    window.callPhantom({ type: 'log', data: data });
                }
            });

            QUnit.done(function(data) {
                window.callPhantom({ type: 'done', data: data });
            });
        }, false);
    });
};

page.open(url, function (status) {
    if (status !== 'success') {
        throw 'Unable to open URL: ' + url + ', status: ' + status;
    }
});
