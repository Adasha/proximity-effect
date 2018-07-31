var gulp = require('gulp');
var babel = require("gulp-babel");
var uglify = require("gulp-uglify");
var rename = require("gulp-rename");
var gzip = require("gulp-gzip");


gulp.task('babel', function() {
    return gulp.src('src/ProximityEffect.js')
    .pipe(babel())
    .pipe(gulp.dest('dist'))
});

gulp.task('minify', function() {
    return gulp.src('dist/ProximityEffect.js')
    .pipe(rename({extname: '.min.js'}))
    .pipe(uglify())
    .pipe(gulp.dest('dist'))
    .pipe(gzip())
    .pipe(gulp.dest('dist'))
});
