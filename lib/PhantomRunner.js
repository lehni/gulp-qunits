'use strict';

let childProcess = require('child_process'),
    gutil = require('gulp-util'),
    path = require('path'),
    phantomjs = require('phantomjs'),
    QUnitRunner = require('./QUnitRunner');

class PhantomRunner extends QUnitRunner {

    constructor(file, options) {
        super('Phantom', file, options);
        let absolute = path.resolve(file.path),
            resolved = absolute.indexOf(file.path) >= 0 ?
                'file:///' + absolute.replace(/\\/g, '/') : file.path,
            queryOptions = ['noGlobals', 'noTryCatch'],
            queryParams = [];

        queryOptions.forEach(function(option) {
            if (options[option])
                queryParams.push(option.toLowerCase());
        });
        resolved += queryParams.length ? '?' + queryParams.join('&') : '';

        this.args.push(this.processPath, resolved);

        if (options.timeout) {
            this.args.push(options.timeout);
        }
    }

    run(stream, callback) {
        let phantomPath = this.options.phantomPath || phantomjs.path;
        this.child = childProcess.spawn(phantomPath, this.args, {
        }, (err) => {
            callback(err, this.file);
        });
        let handleMesssage = super.run(stream, callback),
            buffers = [];
        this.child.stdout.on('data', (data) => {
            // Collect incoming buffers and concatenate and parse them once
            // we meet a new-line at the end.
            buffers.push(data);
            if (/[\n\r]$/.test(data)) {
                Buffer.concat(buffers).toString().split(/\r\n|\n|\r/mg).forEach(
                    function(line) {
                        if (/^\{/.test(line)) {
                            handleMesssage(JSON.parse(line));
                        } else if (line) {
                            gutil.log(line);
                        }
                    }, this
                );
                buffers.length = 0;
            }
        });

        this.child.stderr.on('data', (data) => {
            handleMesssage({
                type: 'error',
                data: data.toString()
            });
        });
    }
}

module.exports = PhantomRunner;
