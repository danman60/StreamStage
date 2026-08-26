plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

/** Where [stageMenuLoop] puts the six-up reel so the asset merger picks it up. */
val MENU_LOOP_STAGE = "generated/menu-loop-asset"

/** Where [stageTabletSurface] puts the booth tablet page so the asset merger picks it up. */
val TABLET_SURFACE_STAGE = "generated/tablet-surface-asset"

android {
    namespace = "com.streamstage.boothloop"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.streamstage.boothloop"
        // Fire OS 5 (Fire TV Stick 2nd gen) is Android 5.1 / API 22. Anything newer is covered.
        minSdk = 22
        targetSdk = 34
        // 5 / 1.3.0 — the stick serves the booth tablet itself (BoothServer.kt), so DART
        // leaving the network no longer takes the tablet with it.
        versionCode = 8
        versionName = "1.5.0"
    }

    // The six-up menu reel is a VIDEO ASSET INSIDE THE APK. Keep it stored, not deflated:
    // a compressed asset cannot be opened with an offset and Media3's AssetDataSource has to
    // stream it through a decompressor to seek, which on a Fire Stick is the difference between
    // an instant loop restart and a visible hitch every 30 seconds. AGP already leaves .mp4
    // alone by default; this says so out loud so a future toolchain change cannot quietly
    // start compressing the one file whose read pattern matters.
    androidResources {
        noCompress.add("mp4")
    }

    buildTypes {
        release {
            // No shrinking. This app is ~5 MB and the only thing that matters is that it
            // starts and plays. R8 stripping a Media3 renderer at a trade show is not a
            // trade worth making.
            isMinifyEnabled = false

            // Signed with the debug key, deliberately.
            //
            // This APK is never published anywhere — it goes on one dedicated Fire Stick over
            // adb, and it will never be updated from a store. What the signature has to do here
            // is exactly one thing: match whatever is already installed, so `adb install -r`
            // upgrades in place and the app keeps its own `/data` (installed.json, films.json —
            // which is what knows which version of each film is current, and what to roll back
            // to). A fresh release key would force an uninstall, and an uninstall on show
            // morning would silently reset every pointer on the stick.
            //
            // An unsigned release APK, which is the default, simply cannot be installed at all.
            signingConfig = signingConfigs.getByName("debug")
        }
        debug {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    // Deliberately no buildFeatures.compose, no viewBinding. A single Activity with one
    // PlayerView built in code. Fewer moving parts = fewer ways to fail on the floor.

    // The staged menu reel (below) is an extra assets source dir rather than a file checked
    // into app/src/main/assets, so there is exactly ONE menu-loop.mp4 in this repo.
    sourceSets["main"].assets.srcDir(layout.buildDirectory.dir(MENU_LOOP_STAGE))
    sourceSets["main"].assets.srcDir(layout.buildDirectory.dir(TABLET_SURFACE_STAGE))
}

// ---------------------------------------------------------------------------------------
// THE SIX-UP MENU REEL, BUNDLED.
//
// `expo-assets/kiosk/menu-loop/menu-loop.mp4` is a rendered build artefact — it is
// deliberately NOT in git (see that folder's .gitignore; rebuild it with
// `node render-menu-loop.mjs`) — so it is copied into the APK's assets at build time
// instead of being duplicated under app/src/main/assets.
//
// WHY IT IS IN THE APK AT ALL, rather than pulled through UpdateManager like the films:
//
//   * It is not a film. Playlist scans the media folder and everything playable in there
//     becomes a slot in the booth reel; the whole reason this file was kept out of `media/`
//     (tv.html:1446) is that an attract reel filed as a film plays as an eighth film. Putting
//     it back on the same path this app takes for films is the one thing the design says not
//     to do.
//   * Offline-hard by construction. Inside the APK it cannot be missing, cannot be half
//     pushed, needs no storage permission, no manifest fetch, no R2, no DART and no wifi.
//     `adb install -r` is the only step, and it is the step Daniel is already doing.
//   * It is 6.4 MB against a 5.5 MB app. That is affordable; 350 MB of films is not, which
//     is exactly why the films take the other path and this does not.
//
// A build with the file absent still succeeds and still installs — the app then reports
// `menuLoop:false` on the bus and refuses `attract menu` honestly instead of cutting the
// booth TV to a black screen. Same failure shape as tv.html's HEAD probe.
// ---------------------------------------------------------------------------------------
val menuLoopSource: File = rootProject.file("../expo-assets/kiosk/menu-loop/menu-loop.mp4")

val stageMenuLoop = tasks.register("stageMenuLoop") {
    description = "Copies the six-up menu reel into the APK assets."
    val outDir = layout.buildDirectory.dir(MENU_LOOP_STAGE)
    outputs.dir(outDir)
    if (menuLoopSource.isFile) inputs.file(menuLoopSource) else inputs.property("reel", "absent")
    doLast {
        val dir = outDir.get().asFile
        dir.mkdirs()
        val dest = File(dir, "menu-loop.mp4")
        if (menuLoopSource.isFile) {
            menuLoopSource.copyTo(dest, overwrite = true)
            logger.lifecycle("Bundled the menu reel: ${dest.length()} bytes from $menuLoopSource")
        } else {
            dest.delete()
            logger.warn(
                "menu-loop.mp4 is NOT at $menuLoopSource — building without the six-up reel. " +
                    "The booth app will report menuLoop:false and refuse `attract menu`. " +
                    "Render it with `node expo-assets/kiosk/menu-loop/render-menu-loop.mjs` and rebuild."
            )
        }
    }
}

// ---------------------------------------------------------------------------------------
// THE BOOTH TABLET PAGE, BUNDLED.
//
// `BoothServer.kt` serves the tablet surface off this stick so the booth survives DART being
// absent — the failure that hit a live show twice on 2026-08-11. These are the files
// `tablet.html` actually asks for, and NOTHING ELSE:
//
//   tablet.html  kiosk.js  brand.css      the page, its one script, its one stylesheet
//   brand/ + brand/icons/                 the wordmark and the three product marks
//   qr/facebook.svg + qr/tablet/*.svg     the codes a visitor scans
//
// About 400 KB in total, against a ~12 MB app.
//
// WHAT IS DELIBERATELY NOT HERE: `media/` — 621 MB of films — and `tv.html`. `tablet.html`
// has no `<video>` element in it (grep it), so the tablet surface has never needed a single
// frame of film; and the TV on this device is this app, not a page. Copying an explicit file
// list rather than the directory is what guarantees that stays true: a glob over
// expo-assets/kiosk would put the films in the APK the first time somebody was not looking.
//
// SOURCED FROM THE REPO, not duplicated into app/src/main/assets, for the same reason
// stageMenuLoop is: `expo-assets/kiosk/` is the one place these files are edited, and a second
// copy in this project is a copy that goes stale silently. A file that is missing at build time
// is a LOUD warning here and a fact on `/health` (`tabletSurface`), never a blank tile somebody
// discovers at the booth.
// ---------------------------------------------------------------------------------------
val kioskDir: File = rootProject.file("../expo-assets/kiosk")

val stageTabletSurface = tasks.register<Copy>("stageTabletSurface") {
    description = "Copies the booth tablet page and its assets into the APK."
    from(kioskDir) {
        include("tablet.html", "kiosk.js", "brand.css")
        include("brand/logo-white.png", "brand/logo-icon-white.png")
        include("brand/icons/*.png")
        include("qr/facebook.svg")
        include("qr/tablet/*.svg")
    }
    into(layout.buildDirectory.dir("$TABLET_SURFACE_STAGE/tablet"))
    // A stale file from a previous layout must not linger in the APK.
    includeEmptyDirs = false

    doFirst {
        val page = File(kioskDir, "tablet.html")
        if (!page.isFile) {
            logger.warn(
                "tablet.html is NOT at ${page.absolutePath} — building WITHOUT the tablet " +
                    "surface. The stick will still play the reel and still take commands, but a " +
                    "tablet pointed at it will get a 404 and /health will report the file missing."
            )
        }
    }
    doLast {
        val n = layout.buildDirectory.dir("$TABLET_SURFACE_STAGE/tablet").get().asFile
            .walkTopDown().count { it.isFile }
        logger.lifecycle("Bundled the booth tablet surface: $n file(s) from $kioskDir")
    }
}

tasks.named("preBuild") { dependsOn(stageMenuLoop, stageTabletSurface) }

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")

    // Media3 / ExoPlayer — local file playback only.
    // NOTE the omissions, they are deliberate: no media3-exoplayer-hls, no -dash,
    // no -datasource-okhttp, no okhttp, no retrofit, no analytics SDK. Nothing in this
    // dependency graph can open a socket. The app also declares no INTERNET permission,
    // so the OS enforces it even if a transitive dependency tried.
    implementation("androidx.media3:media3-exoplayer:1.6.0")
    implementation("androidx.media3:media3-ui:1.6.0")

    // JVM-only unit tests for the pure rule objects in `show/`. Those files import nothing from
    // android.*, on purpose, which is what lets them be tested here in seconds instead of on a
    // device. Test scope only: nothing below ships in the APK.
    testImplementation("junit:junit:4.13.2")
}
