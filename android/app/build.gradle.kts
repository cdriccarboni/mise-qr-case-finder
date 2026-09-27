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
        versionCode = 4
        versionName = "0.2.2-beta.1"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            // Signature de test (keystore debug). Ce n’est pas la clé d’upload Play.
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
}

tasks.named("preBuild") {
    doFirst {
        val index = file("src/main/assets/www/index.html")
        if (!index.exists()) {
            throw GradleException("PWA absente de android/app/src/main/assets/www. Construis le web (npm run build) et copie dist/ avant Gradle.")
        }
    }
}
