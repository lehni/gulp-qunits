# gulp-qunits [![Build Status](https://travis-ci.org/lehni/gulp-qunits.svg?branch=master)](https://travis-ci.org/lehni/gulp-qunits)

Run hybrid unit tests through QUnit in a headless PhantomJS instance, as well as directly in Node.js.
Forked from [gulp-qunit](https://github.com/jonkemp/gulp-qunit) but developed as a separate project, for use in [paper.js](http://paperjs.org).

![](screenshot.png)

## Install

Install with [npm](https://npmjs.org/package/gulp-qunits)

```bash
$ npm install --save-dev gulp-qunits
```

[![NPM](https://nodei.co/npm/gulp-qunits.png?downloads=true)](https://nodei.co/npm/gulp-qunits/)

## Usage

```js
var gulp = require('gulp'),
    qunits = require('gulp-qunits');

gulp.task('test', function() {
    return gulp.src('./qunit/test-runner.html')
        .pipe(qunits());
});
```

With options:

```js
var gulp = require('gulp'),
    qunit = require('gulp-qunits');

gulp.task('test', function() {
    return gulp.src('./qunit/test-runner.html')
        .pipe(qunits({'phantomjs-options': ['--ssl-protocol=any']}));
});
```

## API

### qunits(options)

#### options.timeout

Type: `Number`  
Default: `5`

Pass a number or string value to override the default timeout of 5 seconds.

#### options.phantomjs-options

Type: `Array`  
Default: `None`

These options are passed on to PhantomJS. See the [PhantomJS documentation](http://phantomjs.org/api/command-line.html) for more information.

#### options.binPath

Type: `String`
Default: require("phantomjs").path

The option is used to execute phantomjs binary path

## License

MIT © [Jürg Lehni](http://scratchdisk.com)
