plugins {
    id("com.android.application")
}

android {
    namespace = "fr.acousmatictheatre.mise"
    compileSdk = 36

    defaultConfig {
        applicationId = "fr.acousmatictheatre.mise"
        minSdk = 26
        targetSdk = 36
        versionCode = 2
        versionName = "0.2.0-beta1"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
