#!/usr/bin/env node
'use strict';

// Lighthouse against the live site — `npm run test:live:lighthouse`.
//
//     node scripts/check-lighthouse-live.js                       # measure, compare, fail on a regression
//     node scripts/check-lighthouse-live.js --only=home,search --runs=5
//     node scripts/check-lighthouse-live.js --baseline-from=<dir> # rewrite the baseline from past runs
//
// IwacVisualizations and IwacSearch gate their pull requests on Lighthouse
// budgets measured from committed fixtures, served locally. Those gates are
// deterministic because they leave out everything a fixture cannot hold: the
// server's response time, the jsDelivr delivery of ECharts and MapLibre, this
// theme's stylesheet and webfonts, and the real data payloads. This measures
// exactly that remainder, on the pages readers load (PAGES), from the live
// site — once a week (.github/workflows/live-lighthouse.yml) and on demand.
//
// It is the same runner as the modules' scripts/check-lighthouse.js — keep the
// three in step: Lighthouse 13 driven directly (not @lhci/cli, whose latest
// release pins Lighthouse 12 and brings thirteen high advisories), the Chromium
// the locked @playwright/test pins, mobile with simulated slow 4G (Lighthouse's
// defaults), RUNS runs per page and the median of each figure, held against a
// committed baseline (e2e/lighthouse-baseline.json):
//
//   - the performance score: no lower than the baseline minus
//     PERFORMANCE_MARGIN. The simulation replays the observed server response
//     time, so a slower server shows here as well as below;
//   - the accessibility, best-practices and SEO scores: no lower than the
//     baseline. SEO is scored here and not in the modules: the <head> is the
//     theme's and IWAC-SEO's, and only the live page has the real one;
//   - transfer bytes per kind — document, stylesheet, font, script, image and
//     data (fetch/XHR: the Vis JSON payloads, the Typesense responses) — plus
//     the bytes from origins other than the site's (the CDN) and the request
//     count: no more than BYTES_HEADROOM over the baseline;
//   - the server response time of the page itself (Lighthouse's
//     `server-response-time`, observed, not simulated): no more than
//     SERVER_HEADROOM times the baseline;
//   - a request answered 4xx/5xx in most runs of a page.
//
// A red run is an alert, not a merge gate: nothing about a pull request moves
// these figures until it is released and installed, and the network between
// the runner and Berlin is not the reader's. So, unlike the modules' gates, an
// improvement does not fail — a page that got BYTES_STALE lighter, or whose
// score rose, is a warning to re-baseline, and so is a page with no baseline
// yet (it is still collecting runs).
//
// Re-baselining. Every run writes each run's figures to
// test-results/lighthouse-live/runs.json (the workflow's artifact, kept 90
// days) beside the median run's HTML report per page. A baseline is never one
// run's: the live figures move with the server's load and the runner's CPU, so
// `--baseline-from=<dir>` pools every runs.json under <dir> — the artifacts of
// several CI runs, downloaded with `gh run download` — and writes the median
// of all their runs per page. It refuses fewer than MIN_ATTEMPTS runs, runs
// from outside CI (a laptop's CPU and fonts are not the runner's: IwacSearch's
// pages passed `target-size` on the Linux runner and failed it on Windows), and
// runs that disagree on the Lighthouse or Chromium version. It also prints how
// far each run's median fell from the pooled one, which is what
// PERFORMANCE_MARGIN and SERVER_HEADROOM are measured from.

const { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { chromium } = require('@playwright/test');

const ROOT = path.join(__dirname, '..');
const BASELINE = path.join(ROOT, 'e2e', 'lighthouse-baseline.json');
const OUT = path.join(ROOT, 'test-results', 'lighthouse-live');

// The same variable, and the same default, as playwright.config.js.
const SITE = (process.env.IWAC_LIVE_BASE_URL || 'https://islam.zmo.de/s/westafrica').replace(/\/?$/, '/');

/**
 * The pages readers load, relative to SITE. The chrome is on every one of
 * them; each adds the module surface named. Not the site root itself: it
 * answers with a 301 to page/home.
 */
const PAGES = {
    // The hero banner, the corpus stats and the On this day block.
    home: 'page/home',
    // IwacSearch's two public surfaces: SSR first page, then Typesense.
    search: 'search',
    everything: 'search/everything',
    // The heaviest block page: ECharts, the word-cloud extension and MapLibre
    // from jsDelivr, and collection-overview.json.
    'collection-overview': 'page/collection-overview',
    // An article record: Mirador, the citation panel and the IwacVisualizations
    // article dashboard (the page the live smoke suite samples too).
    article: 'item/23365',
    // The Albani sermons block (IwacVisualizations#31) belongs here once it is
    // placed on a page; the URL 404s as of 2026-10-27.
};

const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
/** Lighthouse resource types → the byte kinds budgeted; anything else is left out. */
const KINDS = {
    Document: 'document',
    Stylesheet: 'stylesheet',
    Font: 'font',
    Script: 'script',
    Image: 'image',
    Fetch: 'data',
    XHR: 'data',
};
const BYTES = [...new Set(Object.values(KINDS)), 'thirdParty'];
const COUNTS = ['requests'];
const METRICS = {
    fcp: 'first-contentful-paint',
    lcp: 'largest-contentful-paint',
    tbt: 'total-blocking-time',
    cls: 'cumulative-layout-shift',
    si: 'speed-index',
};

/** Bytes and requests may grow by this factor before the run is red. */
const BYTES_HEADROOM = 1.10;
/** A page this much lighter than its baseline is a warning to re-baseline. */
const BYTES_STALE = 0.80;
/** How far a page's median performance score may sit below its baseline. */
const PERFORMANCE_MARGIN = 0.10;
/** How many times its baseline a page's median server response time may take. */
const SERVER_HEADROOM = 2;
/** --baseline-from refuses to pool fewer CI runs than this. */
const MIN_ATTEMPTS = 3;

function parseArgs(argv) {
    const args = { runs: 3, only: null, baselineFrom: null };
    for (const arg of argv) {
        if (arg.startsWith('--runs=')) args.runs = Number(arg.slice(7));
        else if (arg.startsWith('--only=')) args.only = arg.slice(7).split(',').filter(Boolean);
        else if (arg.startsWith('--baseline-from=')) args.baselineFrom = arg.slice(16);
        else throw new Error(`unknown argument: ${arg}`);
    }
    if (!Number.isInteger(args.runs) || args.runs < 1) throw new Error('--runs must be a positive integer');
    const unknown = (args.only || []).filter((page) => !(page in PAGES));
    if (unknown.length) throw new Error(`not in PAGES: ${unknown.join(', ')}`);
    return args;
}

function freePort() {
    return new Promise((resolve, reject) => {
        const probe = net.createServer();
        probe.on('error', reject);
        probe.listen(0, '127.0.0.1', () => {
            const { port } = probe.address();
            probe.close(() => resolve(port));
        });
    });
}

const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const round2 = (value) => Math.round(value * 100) / 100;

/** The figures read from one Lighthouse result. */
function measure(lhr) {
    const site = new URL(SITE).origin;
    const bytes = Object.fromEntries(BYTES.map((kind) => [kind, 0]));
    const broken = [];
    let requests = 0;
    for (const request of lhr.audits['network-requests'].details.items) {
        if (!/^https?:/.test(request.url)) continue;
        requests++;
        if (request.statusCode >= 400) broken.push(`${request.statusCode} ${request.url}`);
        const size = request.transferSize || 0;
        const kind = KINDS[request.resourceType];
        if (kind) bytes[kind] += size;
        if (new URL(request.url).origin !== site) bytes.thirdParty += size;
    }
    const scores = Object.fromEntries(CATEGORIES.map((id) => [id, lhr.categories[id].score]));
    const metrics = Object.fromEntries(Object.entries(METRICS).map(([key, id]) => [key, lhr.audits[id].numericValue]));
    return {
        ...scores,
        ...bytes,
        requests,
        serverResponseTime: Math.round(lhr.audits['server-response-time'].numericValue),
        ...metrics,
        benchmarkIndex: lhr.environment.benchmarkIndex,
        broken,
    };
}

/** One Lighthouse run of url in a fresh browser; throws on a run that did not complete. */
async function runOnce(lighthouse, url) {
    // A fresh browser, so a fresh profile: no HTTP cache and no service worker
    // (the theme installs one) carried over from the last run.
    const port = await freePort();
    const browser = await chromium.launch({ channel: 'chromium', args: [`--remote-debugging-port=${port}`] });
    try {
        const result = await lighthouse(url, {
            port,
            output: 'html',
            logLevel: 'error',
            onlyCategories: CATEGORIES,
        });
        if (result.lhr.runtimeError) throw new Error(result.lhr.runtimeError.message);
        // The user agent says 156.0.0.0 (Chrome reduces it); the browser knows.
        return { lhr: result.lhr, html: result.report, figures: measure(result.lhr), chromium: browser.version() };
    } finally {
        await browser.close();
    }
}

async function runPage(lighthouse, page, runs, warnings) {
    const url = new URL(PAGES[page], SITE).href;
    const results = [];
    for (let i = 0; i < runs; i++) {
        // A live page can stall one run — a DevTools call timing out (CSS.enable
        // did, once, on the homepage) — without anything being wrong with it.
        // One retry; a second failure ends the whole run.
        try {
            results.push(await runOnce(lighthouse, url));
        } catch (error) {
            warnings.push(`${page}: run ${i + 1} did not complete and was retried (${error.message})`);
            try {
                results.push(await runOnce(lighthouse, url));
            } catch (again) {
                throw new Error(`${page}: ${again.message}`, { cause: again });
            }
        }
    }
    return results;
}

/** Collapse runs (each a figures object) to one row of medians. */
function row(runs) {
    const out = {};
    for (const id of CATEGORIES) {
        const values = runs.map((run) => run[id]);
        out[id] = values.every((v) => typeof v === 'number') ? round2(median(values)) : null;
    }
    for (const key of [...BYTES, ...COUNTS, 'serverResponseTime']) {
        out[key] = Math.round(median(runs.map((run) => run[key])));
    }
    return out;
}

/** Problems and warnings from a page's own runs, before any baseline. */
function inspect(page, runs, problems, warnings) {
    for (const id of CATEGORIES) {
        if (runs.some((run) => typeof run[id] !== 'number')) problems.push(`${page}: no ${id} score in at least one run`);
    }
    const counts = new Map();
    for (const line of runs.flatMap((run) => [...new Set(run.broken)])) counts.set(line, (counts.get(line) || 0) + 1);
    for (const [line, seen] of counts) {
        const note = `${page}: ${line} (in ${seen} of ${runs.length} runs)`;
        if (seen * 2 > runs.length) problems.push(note);
        else warnings.push(note);
    }
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const ms = (value) => `${value} ms`;

/** Compare a page's medians with its baseline; returns the cells to print. */
function compare(page, measured, base, problems, warnings) {
    const cells = [];
    for (const id of CATEGORIES) {
        if (measured[id] === null) {
            cells.push(`${id} —`);
            continue;
        }
        const floor = id === 'performance' ? round2(base[id] - PERFORMANCE_MARGIN) : base[id];
        cells.push(`${id} ${measured[id].toFixed(2)} (≥ ${floor.toFixed(2)})`);
        if (measured[id] < floor) {
            problems.push(`${page}: ${id} ${measured[id].toFixed(2)} is below its floor of ${floor.toFixed(2)} (baseline ${base[id].toFixed(2)})`);
        } else if (id !== 'performance' && measured[id] > base[id]) {
            warnings.push(`${page}: ${id} rose to ${measured[id].toFixed(2)} from ${base[id].toFixed(2)} — re-baseline to lock it in`);
        }
    }
    for (const key of [...BYTES, ...COUNTS]) {
        const show = key === 'requests' ? String : kb;
        const limit = Math.ceil(base[key] * BYTES_HEADROOM);
        if (measured[key] || base[key]) cells.push(`${key} ${show(measured[key])} (≤ ${show(limit)})`);
        if (measured[key] > limit) {
            problems.push(`${page}: ${key} ${show(measured[key])} is over its budget of ${show(limit)} (baseline ${show(base[key])})`);
        } else if (measured[key] < base[key] * BYTES_STALE) {
            warnings.push(`${page}: ${key} fell to ${show(measured[key])} from ${show(base[key])} — re-baseline to lock it in`);
        }
    }
    const limit = Math.round(base.serverResponseTime * SERVER_HEADROOM);
    cells.push(`server ${ms(measured.serverResponseTime)} (≤ ${ms(limit)})`);
    if (measured.serverResponseTime > limit) {
        problems.push(`${page}: the server took ${ms(measured.serverResponseTime)} to respond, over its limit of ${ms(limit)} (baseline ${ms(base.serverResponseTime)})`);
    }
    return cells;
}

/** Every runs.json under dir, at any depth (one directory per downloaded artifact). */
function findRuns(dir) {
    const found = [];
    for (const name of readdirSync(dir)) {
        const file = path.join(dir, name);
        if (statSync(file).isDirectory()) found.push(...findRuns(file));
        else if (name === 'runs.json') found.push(file);
    }
    return found;
}

/** Pool several CI runs' runs.json into a new baseline; returns the exit code. */
function rebaseline(dir) {
    const attempts = findRuns(dir).map((file) => ({ file, ...JSON.parse(readFileSync(file, 'utf8')) }));
    const refusals = [];
    for (const attempt of attempts) {
        if (!attempt.ci) refusals.push(`${attempt.file}: not measured in CI`);
    }
    for (const key of ['lighthouse', 'chromium']) {
        const seen = [...new Set(attempts.map((attempt) => attempt[key]))];
        if (seen.length > 1) refusals.push(`the runs disagree on the ${key} version (${seen.join(', ')})`);
    }
    const pages = {};
    const spread = [];
    for (const page of Object.keys(PAGES)) {
        const pageAttempts = attempts.filter((attempt) => attempt.pages[page]);
        if (pageAttempts.length < MIN_ATTEMPTS) {
            refusals.push(`${page}: ${pageAttempts.length} run(s) in ${dir}, at least ${MIN_ATTEMPTS} needed`);
            continue;
        }
        const pooled = pageAttempts.flatMap((attempt) => attempt.pages[page]);
        pages[page] = row(pooled);
        // How far one attempt's median fell from the pooled median: the drop a
        // scheduled run has to absorb before PERFORMANCE_MARGIN and
        // SERVER_HEADROOM call it a regression.
        const medians = pageAttempts.map((attempt) => row(attempt.pages[page]));
        spread.push({
            page,
            runs: pooled.length,
            performance: pooled.map((run) => run.performance).join(' '),
            worstPerformanceDrop: round2(Math.max(0, ...medians.map((m) => pages[page].performance - m.performance))),
            serverResponseTime: `${Math.min(...medians.map((m) => m.serverResponseTime))}–${Math.max(...medians.map((m) => m.serverResponseTime))} ms (pooled ${pages[page].serverResponseTime})`,
            worstServerRatio: round2(Math.max(...medians.map((m) => m.serverResponseTime / pages[page].serverResponseTime))),
            bytesRange: BYTES.filter((key) => pooled.some((run) => run[key] !== pooled[0][key]))
                .map((key) => `${key} ${kb(Math.min(...pooled.map((run) => run[key])))}–${kb(Math.max(...pooled.map((run) => run[key])))}`)
                .join(', ') || 'identical in every run',
        });
    }
    if (refusals.length) {
        console.error(`✗ lighthouse-live: not re-baselining from ${attempts.length} run(s)\n`);
        for (const refusal of refusals) console.error(`  ${refusal}`);
        return 1;
    }
    const baseline = {
        _: 'Written by `npm run test:live:lighthouse -- --baseline-from=<dir>` (scripts/check-lighthouse-live.js), never by hand.',
        site: attempts[0].site,
        lighthouse: attempts[0].lighthouse,
        chromium: attempts[0].chromium,
        measuredFrom: attempts.map((attempt) => attempt.run || attempt.startedAt).sort(),
        pages,
    };
    writeFileSync(BASELINE, `${JSON.stringify(baseline, null, 2)}\n`);
    console.log(`✓ lighthouse-live: wrote ${path.relative(ROOT, BASELINE)} from ${attempts.length} runs\n`);
    console.table(spread);
    console.log(`\nPERFORMANCE_MARGIN is ${PERFORMANCE_MARGIN}, SERVER_HEADROOM ${SERVER_HEADROOM}: both should sit well above the worst drop and ratio above.`);
    return 0;
}

function summarise(pages, measured, problems, warnings, runs) {
    if (!process.env.GITHUB_STEP_SUMMARY) return;
    const head = ['page', ...CATEGORIES, ...BYTES, ...COUNTS, 'server'];
    const table = [
        `| ${head.join(' | ')} |`,
        `|${head.map(() => ' --- ').join('|')}|`,
        ...pages.map((page) => {
            const m = measured[page];
            return `| ${page} | ${[...CATEGORIES.map((id) => m[id]), ...BYTES.map((key) => kb(m[key])), ...COUNTS.map((key) => m[key]), ms(m.serverResponseTime)].join(' | ')} |`;
        }),
    ];
    const list = (title, items) => (items.length ? `**${items.length} ${title}:**\n\n${items.map((item) => `- ${item}`).join('\n')}\n\n` : '');
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, [
        `## Live Lighthouse — ${SITE} (median of ${runs})\n`,
        table.join('\n'),
        '',
        list('regression(s)', problems) + list('warning(s)', warnings) || 'Every page within its baseline.\n',
    ].join('\n'));
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (args.baselineFrom) return rebaseline(args.baselineFrom);

    const pages = args.only || Object.keys(PAGES);
    const committed = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : { pages: {} };
    const { default: lighthouse } = await import('lighthouse');
    mkdirSync(OUT, { recursive: true });

    const problems = [];
    const warnings = [];
    const measured = {};
    const record = {
        _: 'Every run of every page, as scripts/check-lighthouse-live.js measured it. The input of --baseline-from.',
        site: SITE,
        startedAt: new Date().toISOString(),
        run: process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_RUN_ID}.${process.env.GITHUB_RUN_ATTEMPT}` : null,
        ci: Boolean(process.env.CI),
        lighthouse: null,
        chromium: null,
        pages: {},
    };
    for (const page of pages) {
        const started = Date.now();
        const results = await runPage(lighthouse, page, args.runs, warnings);
        const runs = results.map((result) => result.figures);
        inspect(page, runs, problems, warnings);
        measured[page] = row(runs);
        record.pages[page] = runs;
        record.lighthouse = results[0].lhr.lighthouseVersion;
        record.chromium = results[0].chromium;
        // The report kept is the run whose performance score is the median one.
        const perf = runs.map((run) => run.performance);
        const kept = results[perf.indexOf([...perf].sort((a, b) => a - b)[Math.floor(perf.length / 2)])];
        writeFileSync(path.join(OUT, `${page}.html`), kept.html);
        console.log(`  measured ${page} in ${((Date.now() - started) / 1000).toFixed(0)} s — performance ${perf.join(', ')}, server ${runs.map((run) => run.serverResponseTime).join(', ')} ms`);
    }
    writeFileSync(path.join(OUT, 'runs.json'), `${JSON.stringify(record, null, 2)}\n`);

    const lines = [];
    for (const page of pages) {
        const base = committed.pages[page];
        if (!base) {
            warnings.push(`${page}: no baseline yet — collecting; pool several runs with --baseline-from`);
            continue;
        }
        lines.push(`${page.padEnd(20)} ${compare(page, measured[page], base, problems, warnings).join('  ')}`);
    }
    if (!args.only) {
        for (const page of Object.keys(committed.pages)) {
            if (!(page in PAGES)) warnings.push(`${page}: has a baseline but is not in PAGES — re-baseline to drop it`);
        }
        if (committed.lighthouse && committed.lighthouse !== record.lighthouse) {
            warnings.push(`the baseline was measured with Lighthouse ${committed.lighthouse}, this run with ${record.lighthouse} — re-baseline`);
        }
        if (committed.chromium && committed.chromium !== record.chromium) {
            warnings.push(`the baseline was measured with Chromium ${committed.chromium}, this run with ${record.chromium} — re-baseline`);
        }
    }
    if (lines.length) console.log(`\n${lines.join('\n')}\n`);
    summarise(pages, measured, problems, warnings, args.runs);

    for (const warning of warnings) {
        console.warn(process.env.GITHUB_ACTIONS ? `::warning title=Live Lighthouse::${warning}` : `  ! ${warning}`);
    }
    if (problems.length) {
        console.error(`✗ lighthouse-live: ${problems.length} regression(s) over ${pages.length} page(s)\n`);
        for (const problem of problems) console.error(`  ${problem}`);
        console.error(`\nReports: ${path.relative(ROOT, OUT)}/<page>.html. A deliberate change re-baselines with --baseline-from.\n`);
        return 1;
    }
    console.log(`✓ lighthouse-live: ${pages.length} page(s) within their baseline (median of ${args.runs} runs)`);
    return 0;
}

main().then(
    (code) => process.exit(code),
    (error) => {
        console.error(`✗ lighthouse-live: ${error.stack || error}`);
        process.exit(1);
    },
);
