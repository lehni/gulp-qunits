'use strict';

let gutil = require('gulp-util'),
    colors = gutil.colors;

let pluginName = 'gulp-qunits';

// The base class for both NodeRunner and PhantomRunner, handling most of the
// inter-process details, as well as and logging.

class QUnitRunner {

    constructor(name, file, options) {
        this.name = colors.cyan(`${pluginName} (${name})`);
        this.file = file;
        this.options = options;
        this.processPath = require.resolve(`./${this.constructor.name}_Process`);
        this.labelFail = colors.red('✖');
        this.labelPass = colors.green('✔');
        this.args = [];
        var processOptions = options.processOptions;
        if (processOptions && processOptions.length) {
            this.args.push.apply(this.args, processOptions);
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
            // Make sure the stack traces are indented the same way:
            let source = data.source.split(/\r\n|\n|\r/mg).map((line) => {
                return /^\w/.test(line) ? `    at ${line}` : line;
            });
            lines.push.apply(lines, source);
        }
        lines.forEach(function(line, i) {
            gutil.log(i > 0 ? `    ${line}` : line);
        });
    }

    start(stream) {
        gutil.log(`${this.name}: Testing ${colors.blue(this.file.relative)}`);
        let timeoutId = null;

        let kill = () => {
            process.removeListener('exit', kill);
            this.child.kill();
        }

        process.on('exit', kill);

        let done = err => {
            clearTimeout(timeoutId);
            stream.emit(pluginName + '.done', { passed: !err });
            if (err)
                stream.emit('error', new gutil.PluginError(pluginName, err));
            kill();
        }

        let ping = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(function() {
                done('Process blocked for too long.');
            }, this.options.timeout * 1000);
        }

        if (this.file.isStream()) {
            done('Streaming not supported');
        }

        // Execute the first ping right away to get the timeout running.
        ping();

        let handleMesssage = (message) => {
            switch (message.type) {
            case 'ping':
                ping();
                break;
            case 'log':
                this.logAssertion(message.data);
                ping();
                break;
            case 'done':
                this.logDone(message.data);
                done(message.data.failed && `${this.name}: ` +
                    colors.red(`${message.data.failed} assertions failed.`));
                break;
            case 'error':
                stream.emit('error', new gutil.PluginError(pluginName,
                        message.data));
                break;
            }
        }

        // Return the handleMessage method, which the subclass will need to
        // call on the incoming data.
        return handleMesssage;
    };
}

module.exports = QUnitRunner;
