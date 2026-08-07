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
        versionCode = 1
        versionName = "1.0.0"
    }

    buildTypes {
        release {
            // No shrinking. This app is ~5 MB and the only thing that matters is that it
            // starts and plays. R8 stripping a Media3 renderer at a trade show is not a
            // trade worth making.
            isMinifyEnabled = false
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
