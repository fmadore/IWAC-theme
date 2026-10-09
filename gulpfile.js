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

// Rebuild asset/js/dist/ (the minified twins the templates load) — see
// scripts/build-js.js.
gulp.task('js', function (done) {
    execFile(process.execPath, ['scripts/build-js.js'], function (err, stdout, stderr) {
        if (stdout) process.stdout.write(stdout);
        if (stderr) process.stderr.write(stderr);
        done(err);
    });
});

gulp.task('css:watch', function () {
    // A token change must also regenerate tokens.json, otherwise watch mode
    // silently drifts from the sibling modules' check-theme-tokens guards.
    // Every variable file, not just _colors.scss: tokens.json publishes the
    // spacing, type, radius, shadow and motion values too (`values`), and the
    // font weights layout.phtml loads (`fonts`).
    gulp.watch([
        './asset/sass/abstracts/variables/*.scss',
        './view/layout/layout.phtml',
    ], gulp.series('tokens'));
    gulp.watch('./asset/sass/**/*.scss', gulp.parallel('css'));
    // Templates load only asset/js/dist/<name>.min.js, so an edit to a source
    // script did nothing in the browser until someone remembered build:js.
    // Vendored *.min.js files are not inputs (scripts/build-js.js).
    gulp.watch(['./asset/js/*.js', '!./asset/js/*.min.js'], gulp.series('js'));
});

// `npm run start`: compile once first so a fresh checkout / branch switch
// never serves stale CSS, then watch.
gulp.task('default', gulp.series('css', 'css:watch'));
