/*
 * Build media/menu-loop.mp4 — the 30-second "choose one" reel for the booth TV.
 *
 *   node render-menu-loop.mjs [--fps 30] [--from 8] [--out ../media/menu-loop.mp4]
 *
 * Two stages:
 *   1. menu-loop.html renders to a PNG sequence WITH ALPHA. The six tile
 *      rectangles are transparent holes (see the clip-path in that file).
 *   2. ffmpeg plays a thumbnail cut from each of the six real films underneath
 *      those holes, then lays the chrome on top.
 *
 * The page is a pure function of window.setT(ms), so frames are walked rather
 * than screen-recorded: same source, same video, and a dropped frame is
 * impossible. Tile geometry comes from window.LAYOUT so the chrome and the
 * footage cannot disagree about where the holes are.
 *
 * --from is where in each film the thumbnail is cut from (default 8s, which is
 * past every film's own title card). The shortest film is studiosage at 48.4s,
 * so a 30s thumbnail from 8s fits inside all six with room to spare.
 *
 * Playwright is not a dependency of this repo; node_modules here is a symlink
 * to a project that already has it. If that link is missing, point it at any
 * checkout with playwright installed.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => {
  const i = process.argv.indexOf('--' + n);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d;
};

const FPS  = Number(arg('fps', 30));
const FROM = Number(arg('from', 8));
// NOT ../media: that folder is the films, and publish-films.sh ships all of it
// to R2 and onto the Fire Stick's reel.
const OUT  = resolve(HERE, arg('out', './menu-loop.mp4'));
const W = 1920, H = 1080;

const work = await mkdtemp(join(tmpdir(), 'menu-loop-'));

/* ---------- stage 1: the chrome, frame by frame, with alpha ---------- */
const browser = await chromium.launch({
  args: ['--force-color-profile=srgb', '--font-render-hinting=none'],
});
const page = await browser.newPage({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
});
await page.goto(pathToFileURL(join(HERE, 'menu-loop.html')).href, { waitUntil: 'load' });
await page.waitForSelector('html[data-ready="1"]');
await page.evaluate(() => Promise.all(
  Array.from(document.images).map((i) => (i.complete ? null : i.decode().catch(() => null)))
));

const LAYOUT = await page.evaluate(() => window.LAYOUT);
await writeFile(join(HERE, 'layout.json'), JSON.stringify(LAYOUT, null, 2));

const TOTAL  = LAYOUT.tiles.length * LAYOUT.slot;   // 30 000 ms
const frames = Math.round((TOTAL / 1000) * FPS);
console.log(`menu loop · ${TOTAL / 1000}s · ${FPS} fps · ${frames} frames · ${W}x${H}`);

for (let f = 0; f < frames; f++) {
  await page.evaluate((ms) => window.setT(ms), (f * 1000) / FPS);
  await page.screenshot({
    path: join(work, String(f).padStart(5, '0') + '.png'),
    omitBackground: true,              // keeps the tile holes transparent
  });
  if (f % 30 === 0) process.stdout.write(`  chrome ${f}/${frames}\r`);
}
await browser.close();
console.log(`\nchrome done · compositing six film thumbnails underneath`);

/* ---------- stage 2: the footage under the holes ---------- */
const secs = TOTAL / 1000;
const args = ['-y', '-framerate', String(FPS), '-i', join(work, '%05d.png')];
for (const t of LAYOUT.tiles) {
  args.push('-ss', String(FROM), '-t', String(secs), '-i', resolve(HERE, t.film));
}
args.push('-f', 'lavfi', '-t', String(secs), '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000');

// Each film is cropped to the tile's 16:9 box rather than letterboxed, so a
// tile is always full-bleed footage with no black bars inside the frame.
// The base MUST carry the target rate. Without `r=`, lavfi's colour source
// defaults to 25 fps, the whole overlay chain inherits it, and the 900 chrome
// frames get resampled down to 750 — every sixth frame silently dropped.
const parts = [`color=c=0x06090D:s=${W}x${H}:d=${secs}:r=${FPS}[base]`];
LAYOUT.tiles.forEach((t, n) => {
  parts.push(
    `[${n + 1}:v]scale=${t.w}:${t.h}:force_original_aspect_ratio=increase,` +
    `crop=${t.w}:${t.h},setsar=1,fps=${FPS}[t${n}]`
  );
});
let last = 'base';
LAYOUT.tiles.forEach((t, n) => {
  const out = `o${n}`;
  parts.push(`[${last}][t${n}]overlay=${t.x}:${t.y}:shortest=0[${out}]`);
  last = out;
});
parts.push(`[${last}][0:v]overlay=0:0:shortest=1,format=yuv420p[v]`);

args.push(
  '-filter_complex', parts.join(';'),
  '-map', '[v]', '-map', `${LAYOUT.tiles.length + 1}:a`,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '19',
  '-profile:v', 'high', '-level', '4.0',
  '-g', String(FPS * 2), '-movflags', '+faststart',
  '-c:a', 'aac', '-b:a', '96k', '-t', String(secs),
  OUT
);

await new Promise((ok, bad) => {
  const ff = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'inherit'] });
  ff.on('exit', (c) => (c === 0 ? ok() : bad(new Error('ffmpeg exited ' + c))));
});

await rm(work, { recursive: true, force: true });
console.log(`wrote ${OUT}`);
