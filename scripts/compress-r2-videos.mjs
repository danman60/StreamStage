/**
 * Batch compress R2 carousel videos for faster web playback.
 *
 * Downloads originals from R2, re-encodes with ffmpeg, re-uploads.
 * Vertical: max 720w, CRF 30 | Landscape: max 1280w, CRF 28
 *
 * Usage:
 *   node scripts/compress-r2-videos.mjs              # full run
 *   node scripts/compress-r2-videos.mjs --dry-run     # show what would happen
 */

import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const DRY_RUN = process.argv.includes('--dry-run');
if (DRY_RUN) console.log('=== DRY RUN MODE ===\n');

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = 'streamstagesite';
const PREFIX = 'streamstage';
const R2_PUBLIC = `https://pub-626d1637ca4c4f34a7916019aaa3efce.r2.dev/${PREFIX}`;

const WORK_DIR = '/tmp/r2-compress';
const ORIG_DIR = path.join(WORK_DIR, 'originals');
const COMP_DIR = path.join(WORK_DIR, 'compressed');
fs.mkdirSync(ORIG_DIR, { recursive: true });
fs.mkdirSync(COMP_DIR, { recursive: true });

// [filename, orientation]
const VIDEOS = [
  // Vertical / reels
  ['grand-river.mp4', 'vertical'],
  ['udc-burl-hilite.mp4', 'vertical'],
  ['udc-london-hilite.mp4', 'vertical'],
  ['jj-lhl-hilite.mp4', 'vertical'],
  ['udc-promo26-portrait.mp4', 'vertical'],
  ['generations-hilite.mp4', 'vertical'],
  ['hsm-final.mp4', 'vertical'],
  ['shuffle-hilite.mp4', 'vertical'],
  ['revolutions-dance.mp4', 'vertical'],
  ['lds-hilite.mp4', 'vertical'],
  ['lds-show-ab.mp4', 'vertical'],
  ['jj-showcase-hilite.mp4', 'vertical'],
  ['sgc-reel-1.mp4', 'vertical'],
  ['sgc-reel-2.mp4', 'vertical'],
  ['embro-reel-1.mp4', 'vertical'],
  ['embro-reel-2.mp4', 'vertical'],
  ['embro-reel-4.mp4', 'vertical'],
  ['embro-reel-5.mp4', 'vertical'],
  // Landscape
  ['trevino-aloha-30s.mp4', 'landscape'],
  ['udc-synergy.mp4', 'landscape'],
  ['udc-promo26-landscape.mp4', 'landscape'],
  ['bruno-epk.mp4', 'landscape'],
  ['jcs-tw-final.mp4', 'landscape'],
  ['jcs-trailer.mp4', 'landscape'],
  ['dolly-promo.mp4', 'landscape'],
  ['cdte25-promo.mp4', 'landscape'],
  ['wsdy-4k.mp4', 'landscape'],
  ['hfn-2025.mp4', 'landscape'],
  ['we-are-wellness.mp4', 'landscape'],
  ['yfc-banquet-final.mp4', 'landscape'],
  ['csod-1min.mp4', 'landscape'],
  ['burger-battle.mp4', 'landscape'],
  ['local-love.mp4', 'landscape'],
  ['studiobeat-demo.mp4', 'landscape'],
];

const MB = 1048576;

function fmtMB(bytes) {
  return (bytes / MB).toFixed(1);
}

async function downloadFromR2(filename, dest) {
  // Use curl for speed (streams directly to disk)
  const url = `${R2_PUBLIC}/${filename}`;
  execSync(`curl -sL "${url}" -o "${dest}"`, { stdio: 'pipe' });
}

async function uploadToR2(localPath, key, contentType) {
  const body = fs.readFileSync(localPath);
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
}

async function run() {
  let totalBefore = 0;
  let totalAfter = 0;
  let processed = 0;
  let skipped = 0;

  for (const [filename, orientation] of VIDEOS) {
    const origPath = path.join(ORIG_DIR, filename);
    const compPath = path.join(COMP_DIR, filename);

    console.log(`\n━━━ ${filename} (${orientation}) ━━━`);

    // Download if not cached
    if (!fs.existsSync(origPath)) {
      process.stdout.write('  Downloading... ');
      await downloadFromR2(filename, origPath);
      console.log('done');
    }

    const origSize = fs.statSync(origPath).size;
    const origMB = fmtMB(origSize);
    totalBefore += origSize;

    // Skip if already small
    const skipThreshold = orientation === 'vertical' ? 5 * MB : 8 * MB;
    if (origSize < skipThreshold) {
      console.log(`  Already small (${origMB} MB) — skipping`);
      totalAfter += origSize;
      skipped++;
      continue;
    }

    // Encode params
    const crf = orientation === 'vertical' ? 30 : 28;
    const maxW = orientation === 'vertical' ? 720 : 1280;
    const scale = `scale=min(${maxW}\\,iw):-2`;

    if (DRY_RUN) {
      console.log(`  Would compress: ${origMB} MB → CRF ${crf}, max ${maxW}w`);
      totalAfter += origSize;
      continue;
    }

    // Compress with ffmpeg
    process.stdout.write(`  Compressing (${origMB} MB, CRF ${crf})... `);
    try {
      execSync(
        `ffmpeg -y -i "${origPath}" ` +
        `-vf "${scale}" ` +
        `-c:v libx264 -preset medium -crf ${crf} ` +
        `-c:a aac -b:a 96k ` +
        `-movflags +faststart ` +
        `-pix_fmt yuv420p ` +
        `"${compPath}"`,
        { stdio: 'pipe', timeout: 300000 }
      );
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      totalAfter += origSize;
      continue;
    }

    const compSize = fs.statSync(compPath).size;
    const compMB = fmtMB(compSize);
    const savings = Math.round((1 - compSize / origSize) * 100);
    totalAfter += compSize;
    processed++;

    console.log(`${origMB} → ${compMB} MB (${savings}% smaller)`);

    // Upload compressed video
    process.stdout.write('  Uploading video... ');
    await uploadToR2(compPath, `${PREFIX}/${filename}`, 'video/mp4');
    console.log('done');

    // Re-generate and upload poster
    const posterName = filename.replace(/\.mp4$/, '_poster.jpg');
    const posterPath = path.join(COMP_DIR, posterName);
    try {
      execSync(
        `ffmpeg -y -i "${compPath}" -ss 1 -frames:v 1 -vf "scale=-2:360" -q:v 3 "${posterPath}"`,
        { stdio: 'pipe' }
      );
      process.stdout.write('  Uploading poster... ');
      await uploadToR2(posterPath, `${PREFIX}/${posterName}`, 'image/jpeg');
      console.log('done');
    } catch {
      console.log('  Poster generation skipped (no video frame at 1s)');
    }

    console.log('  ✓ Complete');
  }

  console.log('\n════════════════════════════════');
  const savings = Math.round((1 - totalAfter / totalBefore) * 100);
  console.log(`TOTAL: ${fmtMB(totalBefore)} MB → ${fmtMB(totalAfter)} MB (${savings}% reduction)`);
  console.log(`Processed: ${processed} | Skipped: ${skipped}`);
  console.log('════════════════════════════════');
}

run().catch(console.error);
