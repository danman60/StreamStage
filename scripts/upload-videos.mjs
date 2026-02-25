import { v2 as cloudinary } from "cloudinary";
import { execSync } from "child_process";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "fs";
import { join } from "path";

cloudinary.config({
  cloud_name: "dz6snntrf",
  api_key: "998525662768845",
  api_secret: "2BtwDar7ta11oWpBZkTz-UFSRiI",
});

const TEMP_DIR = "/tmp/ss-upload";
if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });

const videos = [
  // === DANCE HORIZONTAL ===
  { file: "Bruno\\BrunoEPK.mov", id: "bruno-epk", tags: ["dance", "horizontal"] },
  { file: "TheatreWoodstock\\JCS_TW_FInal.mov", id: "jcs-tw-final", tags: ["dance", "horizontal"] },
  { file: "BackwoodsBarbie\\DollyPromoUpdatedLogo.mov", id: "dolly-promo", tags: ["dance", "horizontal"] },
  { file: "DanceAttack\\CDTE25Promo.mov", id: "cdte25-promo", tags: ["dance", "horizontal"] },
  { file: "TheatreWoodstock\\JCSTrailer.mov", id: "jcs-trailer", tags: ["dance", "horizontal"] },
  { file: "WSDY\\WSDY4k.mp4", id: "wsdy-4k", tags: ["dance", "horizontal"] },
  { file: "HFN25\\HFN2025.mov", id: "hfn-2025", tags: ["dance", "horizontal"] },
  { file: "Footprints\\NNCh5Final.mov", id: "nutcracker-ch5", tags: ["dance", "horizontal"] },
  { file: "2025Recitals\\FINISHED REELS\\REVOLUTIONS Dance_v2.mp4", id: "revolutions-dance", tags: ["dance", "horizontal"] },
  { file: "Generations\\GenerationsJune8thHiliteReel.mp4", id: "generations-hilite", tags: ["dance", "horizontal"] },
  { file: "Lindsay Dance Studio\\LDS25HiLiteReel.mp4", id: "lds-hilite", tags: ["dance", "horizontal"] },
  { file: "2025Recitals\\FINISHED REELS\\LDS25 SHOW A and B trial video V2.mp4", id: "lds-show-ab", tags: ["dance", "horizontal"] },
  { file: "2025Recitals\\FINISHED REELS\\HSM Draft 3.mp4", id: "hsm-final", tags: ["dance", "horizontal"] },
  { file: "2025Recitals\\_EXAMPLEVIDEOShuffle24Hilite.mov", id: "shuffle-hilite", tags: ["dance", "horizontal"] },
  { file: "UDC\\2026\\UDCPromo26PLandscape.mov", id: "udc-promo26-landscape", tags: ["dance", "horizontal"] },
  { file: "UDC\\2025Replays\\BurlHilight.mov", id: "udc-burl-hilite", tags: ["dance", "horizontal"] },
  { file: "UDC\\2025Replays\\LondonHilite.mov", id: "udc-london-hilite", tags: ["dance", "horizontal"] },
  { file: "UDC\\SynergyVideo\\UDCSynergyDraft2.mov", id: "udc-synergy", tags: ["dance", "horizontal"] },
  { file: "JJDanceArts\\25Showcase\\ShowCaseHilite.mov", id: "jj-showcase-hilite", tags: ["dance", "horizontal"] },
  { file: "JJDanceArts\\24LightHeavyLight\\ARCHIVE\\LHLHilite.mov", id: "jj-lhl-hilite", tags: ["dance", "horizontal"] },

  // === DANCE VERTICAL ===
  { file: "UDC\\2026\\UDCPromo26Portrait.mov", id: "udc-promo26-portrait", tags: ["dance", "vertical"] },

  // === BUSINESS HORIZONTAL ===
  { file: "Uvalux\\2026\\WeAreWellness.mov", id: "we-are-wellness", tags: ["business", "horizontal"] },
  { file: "SGC\\Reels\\SGC1.mov", id: "sgc-reel-1", tags: ["business", "horizontal"] },
  { file: "SGC\\Reels\\SGC2.mov", id: "sgc-reel-2", tags: ["business", "horizontal"] },
  { file: "YFCWoodstock\\BanquetVideoFinal.mov", id: "yfc-banquet-final", tags: ["business", "horizontal"] },
  { file: "CaledoniaDance\\CSOD1MinuteFinal.mov", id: "csod-1min", tags: ["business", "horizontal"] },
  { file: "United Way Oxford\\BurgerBattle_10_3.mov", id: "burger-battle", tags: ["business", "horizontal"] },
  { file: "United Way Oxford\\LocalLove.mov", id: "local-love", tags: ["business", "horizontal"] },
  { file: "TrevinoEPK\\30sAloha_10_2.mov", id: "trevino-aloha-30s", tags: ["business", "horizontal"] },
  { file: "2025Recitals\\FINISHED REELS\\Grand River draft 2.mp4", id: "grand-river", tags: ["business", "horizontal"] },
  { file: "EmbroTractorPull\\Reels\\Reel1_9_11.mov", id: "embro-reel-1", tags: ["business", "horizontal"] },
  { file: "EmbroTractorPull\\Reels\\Reel2_9_19.mov", id: "embro-reel-2", tags: ["business", "horizontal"] },
  { file: "EmbroTractorPull\\Reels\\Reel4_10_3.mov", id: "embro-reel-4", tags: ["business", "horizontal"] },
  { file: "EmbroTractorPull\\Reels\\Reel5_10_15.mov", id: "embro-reel-5", tags: ["business", "horizontal"] },
];

const BASE = "G:\\Shared drives\\Stream Stage Company Wide";
const results = { uploaded: [], failed: [] };

// Process one at a time (sequential to avoid overwhelming bandwidth)
for (const v of videos) {
  const winPath = `${BASE}\\${v.file}`;
  const localPath = join(TEMP_DIR, `${v.id}.tmp`);

  console.log(`\n[${results.uploaded.length + results.failed.length + 1}/${videos.length}] ${v.id}`);

  // Copy from Google Drive to local temp via PowerShell
  try {
    console.log(`  Copying to temp...`);
    execSync(
      `powershell.exe -Command "Copy-Item -LiteralPath '${winPath}' -Destination '\\\\\\\\wsl$\\\\Ubuntu\\${localPath}' -Force"`,
      { timeout: 300000, stdio: "pipe" }
    );
  } catch (e) {
    // Try alternative WSL path
    try {
      const wslTempWin = execSync("wslpath -w " + localPath).toString().trim();
      execSync(
        `powershell.exe -Command "Copy-Item -LiteralPath '${winPath}' -Destination '${wslTempWin}' -Force"`,
        { timeout: 300000, stdio: "pipe" }
      );
    } catch (e2) {
      console.log(`  SKIP (copy failed): ${e2.message?.slice(0, 100)}`);
      results.failed.push({ id: v.id, reason: "copy failed" });
      continue;
    }
  }

  if (!existsSync(localPath)) {
    console.log(`  SKIP (file not found after copy)`);
    results.failed.push({ id: v.id, reason: "temp file missing" });
    continue;
  }

  // Upload to Cloudinary
  try {
    console.log(`  Uploading to Cloudinary...`);
    const res = await cloudinary.uploader.upload(localPath, {
      resource_type: "video",
      public_id: v.id,
      folder: "streamstage",
      tags: v.tags,
      overwrite: true,
      chunk_size: 20_000_000, // 20MB chunks for large files
    });

    console.log(`  OK: ${res.secure_url} (${res.width}x${res.height}, ${Math.round(res.duration)}s)`);
    results.uploaded.push({
      id: v.id,
      url: res.secure_url,
      width: res.width,
      height: res.height,
      duration: res.duration,
      tags: v.tags,
    });
  } catch (e) {
    console.log(`  FAIL: ${e.message?.slice(0, 200)}`);
    results.failed.push({ id: v.id, reason: e.message?.slice(0, 200) });
  }

  // Clean up temp file
  try { unlinkSync(localPath); } catch {}
}

console.log(`\n=== RESULTS ===`);
console.log(`Uploaded: ${results.uploaded.length}/${videos.length}`);
console.log(`Failed: ${results.failed.length}`);

writeFileSync(
  "/mnt/d/ClaudeCode/cloudinary-results.json",
  JSON.stringify(results, null, 2)
);
console.log("Results saved to /mnt/d/ClaudeCode/cloudinary-results.json");
