'use strict';

var gulp = require('gulp');
var { execFile } = require('child_process');

gulp.task('css', function () {
    var sass = require('gulp-sass')(require('sass'));
    var postcss = require('gulp-postcss');
    var autoprefixer = require('autoprefixer');
    var cssnano = require('cssnano');

    return gulp.src('./asset/sass/*.scss')
        .pipe(sass({
            outputStyle: 'compressed'
        }).on('error', sass.logError))
        .pipe(postcss([
            autoprefixer(),
            // Structural minification on top of Sass' whitespace compression:
            // merges/dedupes rules and shortens values that `compressed` leaves.
            // The default preset is rendering-safe and passes modern color syntax
            // (oklch / color-mix / CSS masks) through untouched.
            cssnano({ preset: 'default' })
        ]))
        .pipe(gulp.dest('./asset/css'));
});

// Regenerate tokens.json (+ sibling-module copies and the DESIGN-SYSTEM.md
// tables) from _colors.scss — see scripts/build-tokens.js.
gulp.task('tokens', function (done) {
    execFile(process.execPath, ['scripts/build-tokens.js'], function (err, stdout, stderr) {
        if (stdout) process.stdout.write(stdout);
        if (stderr) process.stderr.write(stderr);
        done(err);
    });
});

gulp.task('css:watch', function () {
    // A colour change must also regenerate tokens.json, otherwise watch mode
    // silently drifts from the sibling modules' check-theme-tokens guards.
    gulp.watch('./asset/sass/abstracts/variables/_colors.scss', gulp.series('tokens'));
    gulp.watch('./asset/sass/**/*.scss', gulp.parallel('css'));
});

// `npm run start`: compile once first so a fresh checkout / branch switch
// never serves stale CSS, then watch.
gulp.task('default', gulp.series('css', 'css:watch'));
