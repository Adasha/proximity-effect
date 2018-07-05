var gulp = require('gulp');
var babel = require("gulp-babel");
var minify = require("gulp-uglify");
var rename = require("gulp-rename");

gulp.task('babel', function() {
    return gulp.src('src/MouseFader.js')
    .pipe(babel({
        presets: ['env']
    }))
    .pipe(gulp.dest('dist'))
});

gulp.task('minify', function() {
    return gulp.src('dist/MouseFader.js')
    .pipe(rename({extname: '.min.js'}))
    .pipe(minify())
    .pipe(gulp.dest('dist'))
});
