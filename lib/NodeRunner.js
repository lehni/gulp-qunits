'use strict';

let childProcess = require('child_process'),
    path = require('path'),
    QUnitRunner = require('./QUnitRunner');

class NodeRunner extends QUnitRunner {

    constructor(file, options) {
        super('Node', file, options);
        options.require = this.convertPaths(file, options.require);
        options.file = file.path;
        this.args.push(JSON.stringify(options));
    }

    convertPaths(file, paths) {
        if (paths) {
            var res = [];
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

    run(stream, callback) {
        this.child = childProcess.fork(this.processPath, this.args, {
            env: process.env,
            cwd: this.file.cwd
        }, callback);
        this.child.on('message', this.start(stream));
    }
}

module.exports = NodeRunner;
