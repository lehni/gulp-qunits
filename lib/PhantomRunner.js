'use strict';

let childProcess = require('child_process'),
    gutil = require('gulp-util'),
    path = require('path'),
    phantomjs = require('phantomjs-prebuilt'),
    QUnitRunner = require('./QUnitRunner');

class PhantomRunner extends QUnitRunner {

    constructor(options) {
        super('Phantom', options);
    }

    run(stream, file, callback) {
        let url = 'file:///' + path.resolve(file.path).replace(/\\/g, '/');
        if (this.options.checkGlobals)
            url += '?noglobals';

        let args = this.args.concat([this.processPath, url]);

        this.child = childProcess.spawn(phantomjs.path, args, {
        }, this.createCallback(file, callback));

        let handleMesssage = this.start(stream, file),
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
