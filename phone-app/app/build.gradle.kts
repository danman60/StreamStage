plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.streamstage.phonetoolkit"
    compileSdk = 35

    defaultConfig {
        // ---------------------------------------------------------------------------------
        // THIS APP REPLACES ~/projects/PhonePresenter. Daniel's call: one icon, not two —
        // "no choosing between two icons on stage".
        //
        // applicationId is PhonePresenter's, so a build installs OVER the copy already on his
        // Pixel instead of adding a second launcher entry. `namespace` deliberately stays
        // com.streamstage.phonetoolkit: in AGP the two are independent, so the Kotlin package,
        // R class and BuildConfig keep this app's own name while Android's package identity —
        // which is what the launcher, the installer and the upgrade path key off — stays the
        // one already on the device. Changing which app this ships as is this one line.
        //
        // Both are signed by the same debug keystore on this machine, so the upgrade is
        // signature-compatible. versionCode MUST stay above PhonePresenter's 1.
        applicationId = "com.streamstage.phonepresenter"
        // Same floor as ../tablet-app. Nothing here needs more.
        minSdk = 24
        targetSdk = 34
        // PhonePresenter shipped versionCode 1, so an upgrade must be higher. 2 was the first
        // dual-mode build and is the one on Daniel's Pixel now; 3 is the mode-switch fix, bumped
        // so the two are tellable apart on the device rather than by guessing at a build time.
        // 4 is the launch-picker build: the app asks DECK or KIOSK before it connects to anything,
        // and no LAN sweep starts unless the operator presses a button that says it will.
        // 5 puts the things Daniel had to ask for by curl on the console as buttons: the six-up /
        // film-cards attract toggle, and the booth tablet's three rescue commands plus a line
        // saying whether that tablet has reported in at all.
        versionCode = 8
        versionName = "2.3.0"
    }

    // Diag prints the running version on screen and into every shipped log line, so a report
    // read off the phone can be tied to a build. That needs BuildConfig.
    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        release {
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
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")

    // MediaSessionCompat + VolumeProviderCompat, for the screen-off volume rocker carried over
    // from ~/projects/PhonePresenter (VolumeRemoteService). Same dependency that app shipped.
    implementation("androidx.media:media:1.7.0")

    // RecyclerView + ItemTouchHelper — the drag-to-reorder playlist in FilmPanel. This is the
    // STANDARD Android answer to drag-and-drop reordering (ItemTouchHelper.SimpleCallback), which
    // is why no gesture handling was hand-rolled. It is a UI-toolkit library from AndroidX: it
    // opens no sockets and has no network code, so it does not weaken the "nothing in this graph
    // can phone home" property the rest of these dependencies are chosen for.
    implementation("androidx.recyclerview:recyclerview:1.3.2")

    // Same deliberate omissions as ../tablet-app: no okhttp, no retrofit, no analytics or crash
    // SDK, no play-services, no appcompat, no compose. Everything HTTP is
    // java.net.HttpURLConnection against the LAN. Nothing in this graph can phone home.
}
