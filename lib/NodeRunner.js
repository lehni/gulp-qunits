'use strict';

let childProcess = require('child_process'),
    extend = require('extend'),
    path = require('path'),
    QUnitRunner = require('./QUnitRunner');

class NodeRunner extends QUnitRunner {

    constructor(options) {
        super('Node', options);
    }

    run(stream, file, callback) {
        // Create a translated version of this.options for the current file,
        // then pass it on to the forked process as JSON.
        let options = extend({}, this.options, {
            require: this.convertPaths(file, this.options.require),
            file: file.path
        });

        let args = this.args.concat([JSON.stringify(options)]);

        this.child = childProcess.fork(this.processPath, args, {
            env: process.env,
            cwd: file.cwd
        }, this.createCallback(file, callback));

        this.child.on('message', this.start(stream, file));
    }

    convertPaths(file, paths) {
        if (paths) {
            let res = [];
            (Array.isArray(paths) ? paths : [paths]).forEach(entry => {
                if (typeof entry === 'string') {
                    entry = { path: entry };
                }
                // Distinguish between paths relative to the file's cwd, and
                // absolute modules, for which we need to resolve the
                // node_modules location, as the process is running in a fork.
                entry.path = path.resolve(path.resolve(process.cwd(),
                        /^[.]/.test(entry.path) ? file.cwd : 'node_modules'),
                        entry.path);
                res.push(entry);
            });
            return res;
        }
    }
}

module.exports = NodeRunner;
