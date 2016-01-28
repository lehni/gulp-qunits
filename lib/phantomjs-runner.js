(function () {
    var args = require('system').args;
    // arg[0]: scriptName, args[1...]: arguments
    if (args.length < 2) {
        console.error('Usage:\n' +
            '  phantomjs [phantom arguments] phantomjs-runner.js' +
            ' [url-of-your-qunit-testsuite] [timeout-in-seconds]');
        exit(1);
    }

    var url = args[1],
        timeout = parseInt(args[2] || '0', 10);
        page = require('webpage').create();

    // Route `console.log()` calls from within the Page context to the main
    // Phantom context (i.e. current `this`).
    page.onConsoleMessage = function () {
        console.log.apply(console, arguments);
    };

    page.onInitialized = function () {
        page.evaluate(initialize);
    };

    page.onCallback = function (message) {
        if (message) {
            if (message.name === 'QUnit.done') {
                var result = message.data,
                    failed = !result || !result.total || result.failed;
                if (!result.total) {
                    console.error('No tests were executed. ' +
                            'Are you loading tests asynchronously?');
                }
                exit(failed ? 1 : 0);
            }
        }
    };

    page.open(url, function (status) {
        if (status !== 'success') {
            console.error('Unable to access network: ' + status);
            exit(1);
        } else {
            // Cannot do this verification with the 'DOMContentLoaded' handler
            // because it will be too late to attach it if a page does not have
            // any script tags.
            var qunitMissing = page.evaluate(function () {
                return (typeof QUnit === 'undefined' || !QUnit);
            });
            if (qunitMissing) {
                console.error('The `QUnit` object is not present on this page.');
                exit(1);
            }
            // Set a timeout on the test running, otherwise tests with async
            // problems will hang forever
            if (timeout) {
                setTimeout(function () {
                    console.error('The specified timeout of ' + timeout +
                            ' seconds has expired. Aborting...');
                    exit(1);
                }, timeout * 1000);
            }
            // Do nothing... the callback mechanism will handle everything!
        }
    });

    function initialize() {
        window.document.addEventListener('DOMContentLoaded', function () {
            var failures = [];

            QUnit.log(function(data) {
                // Ignore passing assertions
                if (!data.result) {
                    failures.push(data);
                }
            });

            QUnit.done(function(data) {
                data.failures = failures;
                console.log(JSON.stringify(data));

                if (typeof window.callPhantom === 'function') {
                    window.callPhantom({
                        'name': 'QUnit.done',
                        'data': data
                    });
                }
            });
        }, false);
    }

    function exit(code) {
        if (page)
            page.close();
        setTimeout(function () {
            phantom.exit(code);
        }, 0);
    }
})();
