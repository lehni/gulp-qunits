var gulp = require('gulp'),
    mocha = require('gulp-mocha'),
    qunits = require('./index');

var paths = {
    scripts: ['./*.js', '!./gulpfile.js']
};
gulp.task('test', function() {
    return gulp.src('./test/*.js')
        .pipe(mocha());
});

gulp.task('qunit:pass', function() {
    return gulp.src('./test/fixtures/passing.html')
        .pipe(qunits());
});

gulp.task('qunit:fail', function() {
    return gulp.src('./test/fixtures/failing.html')
        .pipe(qunits())
        .on('error', function (err) {
            console.log(err.toString());
            this.emit('end');
        });
});

gulp.task('qunit:globals', function() {
    return gulp.src('./test/fixtures/check-globals.html')
        .pipe(qunits({ checkGlobals: true }))
        .on('error', function (err) {
            console.log(err.toString());
            this.emit('end');
        });
});

gulp.task('watch', function () {
    gulp.watch(paths.scripts, ['lint', 'test']);
});

gulp.task('default', ['lint', 'test', 'watch']);
