plugins {
    id("com.android.application")
}

// Identifiant Play. Aucune fiche n’existe encore : ce n’est pas une mise à jour.
// namespace et applicationId passent tous les deux par cette constante.
val playApplicationId = "fr.acousmatictheatre.mises"

android {
    namespace = playApplicationId
    compileSdk = 36

    defaultConfig {
        applicationId = playApplicationId
        minSdk = 26
        targetSdk = 36
        versionCode = 17
        versionName = "0.4.0-beta.5"
    }

    signingConfigs {
        val uploadStore = System.getenv("MISE_UPLOAD_STORE_FILE")
        if (!uploadStore.isNullOrBlank()) {
            create("upload") {
                storeFile = file(uploadStore)
                storePassword = System.getenv("MISE_UPLOAD_STORE_PASSWORD")
                keyAlias = System.getenv("MISE_UPLOAD_KEY_ALIAS")
                keyPassword = System.getenv("MISE_UPLOAD_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            // Play/release exige la vraie clé d’upload. Jamais de faux « PLAY » signé debug.
            signingConfigs.findByName("upload")?.let { signingConfig = it }
        }
        debug {
            // APK de test installable (Pixel, sideload). Ne pas présenter comme artefact Play.
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("androidx.core:core:1.15.0")
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


afterEvaluate {
    val uploadMissing = android.signingConfigs.findByName("upload") == null
    tasks.matching { it.name in setOf("assembleRelease", "bundleRelease", "packageReleaseBundle", "signReleaseBundle") }.configureEach {
        doFirst {
            if (uploadMissing) {
                throw GradleException(
                    "Build Play/release refusé : clé d'upload absente. " +
                    "Définis MISE_UPLOAD_STORE_FILE, MISE_UPLOAD_STORE_PASSWORD, MISE_UPLOAD_KEY_ALIAS, MISE_UPLOAD_KEY_PASSWORD. " +
                    "Pour un APK test installable, utilise :app:assembleDebug (jamais présenté comme PLAY)."
                )
            }
        }
    }
}
