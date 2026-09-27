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
        versionCode = 9
        versionName = "0.3.0-beta.4"
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
            // Clé d’upload Play seulement si MISE_UPLOAD_STORE_FILE est défini.
            // Sinon signature debug : ce n’est pas une mise à jour Play.
            signingConfig = if (signingConfigs.findByName("upload") != null) {
                signingConfigs.getByName("upload")
            } else {
                signingConfigs.getByName("debug")
            }
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
