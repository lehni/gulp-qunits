'use strict';

var url = require('system').args[1];
if (!url) {
    exit(1);
}

var page = require('webpage').create(),
    system = require('system');

phantom.onError = function(msg, trace) {
    if (Array.isArray(trace)) {
        trace.forEach(function(entry) {
            msg += '\n' + entry.file + ':' + entry.line;
        });
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
        system.stderr.writeLine('Unable to access network: ' + status);
        exit(1);
    } else {
        // Cannot do this verification with the 'DOMContentLoaded' handler
        // because it will be too late to attach it if a page does not have
        // any script tags.
        var qunitMissing = page.evaluate(function () {
            return (typeof QUnit === 'undefined' || !QUnit);
        });
        if (qunitMissing) {
            system.stderr.writeLine(
                    'The `QUnit` object is not present on this page.');
            exit(1);
        }
    }
});

function exit(code) {
    if (page) {
        page.close();
    }
    setTimeout(function () {
        phantom.exit(code);
    }, 0);
}
