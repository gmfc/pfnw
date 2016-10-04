var browserify = require("browserify");
var gulp = require("gulp");
var uglify = require("gulp-uglify");
var source = require("vinyl-source-stream");
var buffer = require("vinyl-buffer");
var rename = require("gulp-rename");
var docco = require("gulp-docco");
var del = require("del");

gulp.task("rtcontrol", function() {
    return browserify("./src/RealTimeController.js")
        .bundle()
        .pipe(source("rtcontrol.js")) // gives streaming vinyl file object
        .pipe(buffer()) // <----- convert from streaming to buffered vinyl file object
        //.pipe(uglify()) // now gulp-uglify works
        .pipe(gulp.dest("./ui/js"));
});

gulp.task("controladorIndex", function() {
    gulp.src("./src/index-controlar.js")
        .pipe(uglify().on("error", function(e) {
            console.error(e);
        }))
        .pipe(rename("controladorIndex.js"))
        .pipe(gulp.dest("./ui/js"));
});

gulp.task("docs", ["clean:docs"], function() {
    gulp.src("./src/*.js")
        .pipe(docco())
        .pipe(gulp.dest("./docs"));
});

gulp.task("clean:docs", function() {
    return del([
        // here we use a globbing pattern to match everything inside the `mobile` folder
        "docs/**/*",
        // we don't want to clean this file though so we negate the pattern
        "!docs/Documentacao.mdj"
    ]);
});

gulp.task("clean:js", function() {
    return del([
        // here we use a globbing pattern to match everything inside the `mobile` folder
        "./ui/js/**/*"
    ]);
});

gulp.task('stream', function() {
    gulp.watch('./src/**/*.js', ['build']);
});

gulp.task("build", ["clean:js", "rtcontrol", "controladorIndex"]);