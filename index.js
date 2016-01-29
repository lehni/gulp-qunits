'use strict';

let extend = require('extend'),
    through = require('through2'),
    NodeRunner = require('./lib/NodeRunner'),
    PhantomRunner = require('./lib/PhantomRunner');

module.exports = function(params) {
    let options = extend({
        timeout: 5
    }, params);

    return through.obj(function(file, encoding, callback) {
        let ctor = /\.html$/.test(file.path) ? PhantomRunner : NodeRunner,
            runner = new ctor(options);
        runner.run(this, file, (err) => callback(err, file));
    });
};
