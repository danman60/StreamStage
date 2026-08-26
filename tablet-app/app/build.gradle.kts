plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.streamstage.boothtablet"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.streamstage.boothtablet"
        // Any tablet worth putting on a booth table is API 24+. Immersive sticky needs 19,
        // so 24 costs nothing. (There is no screen pinning in this app any more — removed on
        // instruction — so nothing here is holding minSdk up for lock task.)
        minSdk = 24
        targetSdk = 34
        versionCode = 3
        versionName = "1.2.0"
    }

    // Diag reports the running version on screen and in every shipped log line, so that a
    // report read off a booth tablet can be tied to a build. That needs BuildConfig.
    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        release {
            // No shrinking, same reasoning as kiosk-app: this app is tiny and the only
            // thing that matters is that it starts and stays on the kiosk page.
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

    // No compose, no viewBinding, no appcompat. One Activity, a WebView and an overlay
    // built in code. The whole UI belongs to the kiosk page; this is only the frame.
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")

    // NOTE the omissions, deliberate: no okhttp, no retrofit, no analytics/crash SDK,
    // no play-services. Discovery uses java.net.HttpURLConnection against the LAN only.
    // Nothing in this graph phones home, and there is no code path to the internet.
}
