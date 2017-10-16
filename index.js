'use strict';

let extend = require('extend'),
    through = require('through2');

module.exports = function(params) {
    let options = extend({
        timeout: 5
    }, params);

    return through.obj(function(file, encoding, callback) {
        let name = /\.htm[l]?$/.test(file.path) ? 'PhantomRunner' : 'NodeRunner',
            runner = require(`./lib/${name}`);
        new runner(options).run(this, file, callback);
    });
};
