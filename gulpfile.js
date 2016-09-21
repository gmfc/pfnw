var browserify = require('browserify');
var gulp = require('gulp');
var uglify = require('gulp-uglify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var rename = require("gulp-rename");
var docco = require("gulp-docco");

gulp.task('controladorCOP', function () {
    return browserify('./src/SerialHandler.js')
        .bundle()
        .pipe(source('controladorCOP.js')) // gives streaming vinyl file object
        .pipe(buffer()) // <----- convert from streaming to buffered vinyl file object
        .pipe(uglify()) // now gulp-uglify works 
        .pipe(gulp.dest('./ui/js'));
});

gulp.task('controladorIndex', function () {
    gulp.src('./src/index-controlar.js')
        .pipe(uglify().on('error', function (e) {
            console.log(e);
        }))
        .pipe(rename('controladorIndex.js'))
        .pipe(gulp.dest('./ui/js'));
});

gulp.task('docs', function () {
    gulp.src("./src/*.js")
        .pipe(docco())
        .pipe(gulp.dest('./docs'))

});

gulp.task('build', ['controladorCOP', 'controladorIndex']);