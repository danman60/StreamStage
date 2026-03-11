/**
 * Migrate StreamStage videos from Cloudinary to Cloudflare R2
 *
 * For each video:
 * 1. Download from Cloudinary (original quality)
 * 2. Re-encode to h264 MP4 at max 1080p height (matching Cloudinary delivery)
 * 3. Generate poster image (1s frame, vertical=480p, horizontal=360p)
 * 4. Upload video + poster to R2
 * 5. Clean up temp files
 *
 * Usage: node scripts/migrate-to-r2.mjs [--dry-run] [--only=video-id]
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// ── R2 Config ──
const R2_ACCOUNT_ID = '186f898742315ca57c73b8cf3f9d6917';
const R2_BUCKET = 'compsyncmedia';
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: 'd1d5db3249b970644b60a2ccf6f7e1b4',
    secretAccessKey: 'a080ed4356883fd62bc677abbe080ecb18fc1092e59a41b9a4b60b323e9cac62',
  },
});

// ── Cloudinary Config ──
const CLD_BASE = 'https://res.cloudinary.com/dz6snntrf/video/upload';

// ── Video Catalog (from upload-videos.mjs) ──
const videos = [
  // Dance - Horizontal
  { id: 'bruno-epk', ext: 'mov', orientation: 'horizontal', category: 'dance' },
  { id: 'jcs-tw-final', ext: 'mov', orientation: 'horizontal', category: 'dance' },
  { id: 'dolly-promo', ext: 'mov', orientation: 'horizontal', category: 'dance' },
  { id: 'cdte25-promo', ext: 'mov', orientation: 'horizontal', category: 'dance' },
  { id: 'jcs-trailer', ext: 'mov', orientation: 'horizontal', category: 'dance' },
  { id: 'wsdy-4k', ext: 'mov', orientation: 'horizontal', category: 'dance' },
  { id: 'hfn-2025', ext: 'mov', orientation: 'horizontal', category: 'dance' },
  { id: 'nutcracker-ch5', ext: 'mov', orientation: 'horizontal', category: 'dance' },
  { id: 'revolutions-dance', ext: 'mov', orientation: 'horizontal', category: 'dance' },
  { id: 'generations-hilite', ext: 'mov', orientation: 'horizontal', category: 'dance' },
  { id: 'lds-hilite', ext: 'mov', orientation: 'horizontal', category: 'dance' },
  { id: 'lds-show-ab', ext: 'mov', orientation: 'horizontal', category: 'dance' },
  { id: 'hsm-final', ext: 'mov', orientation: 'horizontal', category: 'dance' },
  { id: 'shuffle-hilite', ext: 'mov', orientation: 'horizontal', category: 'dance' },
  { id: 'udc-promo26-landscape', ext: 'mov', orientation: 'horizontal', category: 'dance' },
  { id: 'udc-burl-hilite', ext: 'mov', orientation: 'horizontal', category: 'dance' },
  { id: 'udc-london-hilite', ext: 'mov', orientation: 'horizontal', category: 'dance' },
  { id: 'udc-synergy', ext: 'mov', orientation: 'horizontal', category: 'dance' },
  { id: 'jj-showcase-hilite', ext: 'mov', orientation: 'horizontal', category: 'dance' },
  { id: 'jj-lhl-hilite', ext: 'mov', orientation: 'horizontal', category: 'dance' },
  // Dance - Vertical
  { id: 'udc-promo26-portrait', ext: 'mov', orientation: 'vertical', category: 'dance' },
  // Business - Horizontal
  { id: 'we-are-wellness', ext: 'mp4', orientation: 'horizontal', category: 'business' },
  { id: 'sgc-reel-1', ext: 'mp4', orientation: 'horizontal', category: 'business' },
  { id: 'sgc-reel-2', ext: 'mp4', orientation: 'horizontal', category: 'business' },
  { id: 'yfc-banquet-final', ext: 'mp4', orientation: 'horizontal', category: 'business' },
  { id: 'csod-1min', ext: 'mp4', orientation: 'horizontal', category: 'business' },
  { id: 'burger-battle', ext: 'mp4', orientation: 'horizontal', category: 'business' },
  { id: 'local-love', ext: 'mp4', orientation: 'horizontal', category: 'business' },
  { id: 'trevino-aloha-30s', ext: 'mp4', orientation: 'horizontal', category: 'business' },
  { id: 'grand-river', ext: 'mp4', orientation: 'horizontal', category: 'business' },
  { id: 'embro-reel-1', ext: 'mp4', orientation: 'horizontal', category: 'business' },
  { id: 'embro-reel-2', ext: 'mp4', orientation: 'horizontal', category: 'business' },
  { id: 'embro-reel-4', ext: 'mp4', orientation: 'horizontal', category: 'business' },
  { id: 'embro-reel-5', ext: 'mp4', orientation: 'horizontal', category: 'business' },
];

// ── Args ──
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const onlyFilter = args.find(a => a.startsWith('--only='));
const onlyId = onlyFilter ? onlyFilter.split('=')[1] : null;

const TMP_DIR = '/tmp/ss-r2-migrate';
fs.mkdirSync(TMP_DIR, { recursive: true });

async function existsInR2(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    return true;
  } catch { return false; }
}

async function uploadToR2(key, filePath, contentType) {
  const stat = fs.statSync(filePath);
  const stream = fs.createReadStream(filePath);
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: stream,
    ContentLength: stat.size,
    ContentType: contentType,
  }));
  return stat.size;
}

function downloadFromCloudinary(videoId, ext) {
  const url = `${CLD_BASE}/streamstage/${videoId}.${ext}`;
  const outPath = path.join(TMP_DIR, `${videoId}_orig.${ext}`);

  if (fs.existsSync(outPath)) {
    console.log(`  [cache] Using existing download: ${outPath}`);
    return outPath;
  }

  console.log(`  [download] ${url}`);
  execSync(`curl -sL -o "${outPath}" "${url}"`, { timeout: 300000 });

  const size = fs.statSync(outPath).size;
  if (size < 10000) {
    fs.unlinkSync(outPath);
    throw new Error(`Download too small (${size} bytes) — likely 404`);
  }
  console.log(`  [download] ${(size / 1024 / 1024).toFixed(1)} MB`);
  return outPath;
}

function encodeVideo(inputPath, videoId) {
  const outPath = path.join(TMP_DIR, `${videoId}.mp4`);

  if (fs.existsSync(outPath)) {
    console.log(`  [cache] Using existing encode: ${outPath}`);
    return outPath;
  }

  // Max height 1080, maintain aspect ratio, h264+aac, web-optimized
  const cmd = [
    'ffmpeg', '-y', '-i', `"${inputPath}"`,
    '-vf', '"scale=-2:min(ih\\,1080)"',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart',
    '-pix_fmt', 'yuv420p',
    `"${outPath}"`,
  ].join(' ');

  console.log(`  [encode] → ${videoId}.mp4`);
  execSync(cmd, { timeout: 600000, stdio: 'pipe' });

  const size = fs.statSync(outPath).size;
  console.log(`  [encode] ${(size / 1024 / 1024).toFixed(1)} MB`);
  return outPath;
}

function generatePoster(inputPath, videoId, orientation) {
  const height = orientation === 'vertical' ? 480 : 360;
  const outPath = path.join(TMP_DIR, `${videoId}_poster.jpg`);

  if (fs.existsSync(outPath)) {
    console.log(`  [cache] Using existing poster: ${outPath}`);
    return outPath;
  }

  const cmd = [
    'ffmpeg', '-y', '-i', `"${inputPath}"`,
    '-ss', '1', '-frames:v', '1',
    '-vf', `"scale=-2:${height}"`,
    '-q:v', '3',
    `"${outPath}"`,
  ].join(' ');

  console.log(`  [poster] → ${videoId}_poster.jpg (h=${height})`);
  execSync(cmd, { timeout: 60000, stdio: 'pipe' });
  return outPath;
}

async function migrateVideo(video) {
  const videoKey = `streamstage/${video.id}.mp4`;
  const posterKey = `streamstage/${video.id}_poster.jpg`;

  console.log(`\n── ${video.id} (${video.orientation}, ${video.category}) ──`);

  // Check if already migrated
  if (await existsInR2(videoKey)) {
    console.log(`  [skip] Already in R2`);
    return { id: video.id, status: 'skipped' };
  }

  if (DRY_RUN) {
    console.log(`  [dry-run] Would download, encode, generate poster, upload`);
    return { id: video.id, status: 'dry-run' };
  }

  try {
    // 1. Download original from Cloudinary
    const origPath = downloadFromCloudinary(video.id, video.ext);

    // 2. Encode to h264 MP4 at max 1080p
    const mp4Path = encodeVideo(origPath, video.id);

    // 3. Generate poster
    const posterPath = generatePoster(mp4Path, video.id, video.orientation);

    // 4. Upload to R2
    console.log(`  [upload] video → ${videoKey}`);
    const videoSize = await uploadToR2(videoKey, mp4Path, 'video/mp4');
    console.log(`  [upload] poster → ${posterKey}`);
    await uploadToR2(posterKey, posterPath, 'image/jpeg');

    // 5. Clean up original (keep encoded for re-upload if needed)
    fs.unlinkSync(origPath);

    console.log(`  [done] ${(videoSize / 1024 / 1024).toFixed(1)} MB uploaded`);
    return { id: video.id, status: 'migrated', size: videoSize };
  } catch (err) {
    console.error(`  [FAIL] ${err.message}`);
    return { id: video.id, status: 'failed', error: err.message };
  }
}

async function main() {
  const toMigrate = onlyId
    ? videos.filter(v => v.id === onlyId)
    : videos;

  if (toMigrate.length === 0) {
    console.error(`No video found with id: ${onlyId}`);
    process.exit(1);
  }

  console.log(`=== StreamStage Cloudinary → R2 Migration ===`);
  console.log(`Videos: ${toMigrate.length}${DRY_RUN ? ' (DRY RUN)' : ''}`);
  console.log(`Bucket: ${R2_BUCKET}`);
  console.log(`Prefix: streamstage/`);

  const results = [];
  for (const video of toMigrate) {
    const result = await migrateVideo(video);
    results.push(result);
  }

  console.log(`\n=== Results ===`);
  const migrated = results.filter(r => r.status === 'migrated');
  const skipped = results.filter(r => r.status === 'skipped');
  const failed = results.filter(r => r.status === 'failed');

  console.log(`Migrated: ${migrated.length}`);
  console.log(`Skipped:  ${skipped.length}`);
  console.log(`Failed:   ${failed.length}`);

  if (failed.length > 0) {
    console.log(`\nFailed videos:`);
    failed.forEach(f => console.log(`  - ${f.id}: ${f.error}`));
  }

  // Clean up tmp dir if everything succeeded
  if (failed.length === 0 && !DRY_RUN) {
    console.log(`\nCleaning up ${TMP_DIR}...`);
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
