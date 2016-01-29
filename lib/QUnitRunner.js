'use strict';

let gutil = require('gulp-util'),
    colors = gutil.colors;

let pluginName = 'gulp-qunits';

// The base class for both NodeRunner and PhantomRunner, handling most of the
// inter-process details, as well as and logging.

class QUnitRunner {

    constructor(name, options) {
        this.name = colors.cyan(`${pluginName} (${name})`);
        this.options = options;
        this.processPath = require.resolve(`./${this.constructor.name}_Process`);
        this.labelFail = colors.red('✖');
        this.labelPass = colors.green('✔');
        this.args = [];
        let args = options.arguments;
        if (args && args.length) {
            this.args.push.apply(this.args, args);
        }
    }

    logDone(data) {
        let passed = !data.failed,
            color = passed ? colors.green : colors.red,
            label = passed ? this.labelPass : this.labelFail;
        gutil.log(`${this.name}: ${label} Took ${data.runtime} ms to run ` +
            `${colors.blue(data.total)} tests. ` +
            color(data.passed + ' passed, ' + data.failed + ' failed.'));
    }

    logAssertion(data) {
        let passed = data.result,
            color = passed ? colors.green : colors.red,
            label = passed ? this.labelPass : this.labelFail,
            verb = passed ? 'Passed' : 'Failed';
        let lines = [
            `${this.name}: ${label}` + color(` Test ${verb.toLowerCase()}: `),
            `${data.module}: ${colors.gray(data.name)}`
        ];
        let line = `${verb} assertion: ${colors.gray(data.message || '')}`;
        if (!passed && data.expected !== undefined) {
            line += `, expected: ${data.expected}, was: ${color(data.actual)}`;
        }
        lines.push(line);
        if (data.source) {
            // Make sure the stack traces are indented the same way. PhantomJS
            // return stack traces without indentation or 'at ' prefix.
            let sourceLines = data.source.split(/\r\n|\n|\r/mg).map((line) => {
                return /^\w/.test(line) ? `    at ${line}` : line;
            });
            lines.push.apply(lines, sourceLines);
        }
        lines.forEach(function(line, i) {
            // Indent every line except the first.
            gutil.log(i > 0 ? `    ${line}` : line);
        });
    }

    createError(err) {
        return err && new gutil.PluginError(pluginName, err);
    }

    createCallback(file, callback) {
        return (err) => callback(this.createError(err), file);
    }

    start(stream, file) {
        gutil.log(`${this.name}: Testing ${colors.blue(file.relative)}`);

        let kill = () => {
            process.removeListener('exit', kill);
            this.child.kill();
        }

        process.on('exit', kill);

        // Install a timeout timer that ends the process with an error message
        // if it doesn't finish before.
        let timeout = this.options.timeout,
            timeoutId = timeout && setTimeout(() => {
                done(`The specified timeout of ${timeout} ` +
                        `seconds has expired. Aborting...`);
            }, timeout * 1000);

        let done = err => {
            clearTimeout(timeoutId);
            stream.emit(pluginName + '.done', { passed: !err });
            if (err) {
                stream.emit('error', this.createError(err));
            }
            kill();
        }

        if (file.isStream()) {
            done('Streaming not supported');
        }

        let handleMesssage = (message) => {
            switch (message.type) {
            case 'log':
                this.logAssertion(message.data);
                break;
            case 'done':
                this.logDone(message.data);
                done(message.data.failed && `${this.name}: ` +
                    colors.red(`${message.data.failed} assertions failed.`));
                break;
            case 'error':
                done(message.data);
                break;
            }
        }

        // Return the handleMessage method, which the subclass will need to
        // call on the incoming data.
        return handleMesssage;
    };
}

module.exports = QUnitRunner;
