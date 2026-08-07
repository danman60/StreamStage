// StreamStage Phone — the one app in Daniel's hand, in either of two roles.
// Same pinned toolchain as ../tablet-app and ../kiosk-app (verified working on this machine:
// Gradle 8.11.1 / AGP 8.7.3 / Kotlin 2.1.0, JDK 21 launcher, jvmTarget 17).
plugins {
    id("com.android.application") version "8.7.3" apply false
    id("org.jetbrains.kotlin.android") version "2.1.0" apply false
}
