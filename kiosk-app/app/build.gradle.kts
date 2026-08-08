plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.streamstage.boothloop"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.streamstage.boothloop"
        // Fire OS 5 (Fire TV Stick 2nd gen) is Android 5.1 / API 22. Anything newer is covered.
        minSdk = 22
        targetSdk = 34
        versionCode = 3
        versionName = "1.1.1"
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
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")

    // Media3 / ExoPlayer — local file playback only.
    // NOTE the omissions, they are deliberate: no media3-exoplayer-hls, no -dash,
    // no -datasource-okhttp, no okhttp, no retrofit, no analytics SDK. Nothing in this
    // dependency graph can open a socket. The app also declares no INTERNET permission,
    // so the OS enforces it even if a transitive dependency tried.
    implementation("androidx.media3:media3-exoplayer:1.6.0")
    implementation("androidx.media3:media3-ui:1.6.0")
}
