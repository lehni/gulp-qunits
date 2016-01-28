'use strict';

let extend = require('extend'),
    through = require('through2'),
    NodeRunner = require('./lib/NodeRunner'),
    PhantomRunner = require('./lib/PhantomRunner');

module.exports = function(params) {
    var options = extend({
        timeout: 5
    }, params);

    return through.obj(function(file, encoding, callback) {
        let ctor = /\.html$/.test(file.path) ? PhantomRunner : NodeRunner;
        var runner = new ctor(file, options);
        runner.run(this, callback);
    });
};
