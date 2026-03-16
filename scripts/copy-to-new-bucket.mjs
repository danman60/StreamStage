/**
 * Copy videos from compsyncmedia/streamstage/ to streamstagesite bucket
 */
import { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const creds = {
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
};

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: creds,
});

const SRC_BUCKET = 'compsyncmedia';
const DST_BUCKET = 'streamstagesite';
const PREFIX = 'streamstage/';

async function run() {
  // List all objects in source
  console.log(`Listing ${SRC_BUCKET}/${PREFIX}...`);
  const list = await s3.send(new ListObjectsV2Command({
    Bucket: SRC_BUCKET,
    Prefix: PREFIX,
  }));

  const objects = list.Contents || [];
  console.log(`Found ${objects.length} objects\n`);

  let copied = 0;
  for (const obj of objects) {
    const key = obj.Key;
    // Keep same key structure (streamstage/video-id.mp4)
    const contentType = key.endsWith('.jpg') ? 'image/jpeg' : 'video/mp4';

    process.stdout.write(`  ${key} (${(obj.Size / 1024 / 1024).toFixed(1)} MB)...`);

    // Download from source
    const get = await s3.send(new GetObjectCommand({ Bucket: SRC_BUCKET, Key: key }));
    const chunks = [];
    for await (const chunk of get.Body) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);

    // Upload to destination
    await s3.send(new PutObjectCommand({
      Bucket: DST_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }));

    console.log(' OK');
    copied++;
  }

  console.log(`\nDone — ${copied} objects copied to ${DST_BUCKET}`);
}

run().catch(err => { console.error('FAIL:', err.message); process.exit(1); });
