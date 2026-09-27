package fr.acousmatictheatre.mises;

import android.webkit.JavascriptInterface;

/** Signale à la PWA que l’identification Google ne doit pas démarrer dans cette WebView. */
public final class AndroidShellBridge {
    static final String GOOGLE_SIGN_IN_MESSAGE =
            "La connexion Google n’est pas disponible dans l’application Android : Google bloque l’identification dans la fenêtre intégrée. "
                    + "Tu peux continuer sans compte. Tes objets, photos et mémos restent sur l’appareil. "
                    + "Exporte une sauvegarde depuis Partager et outils, ou ouvre MISES ! dans Chrome pour synchroniser ton propre Google Drive.";

    @JavascriptInterface
    public boolean googleSignInAvailable() {
        return false;
    }

    @JavascriptInterface
    public String googleSignInMessage() {
        return GOOGLE_SIGN_IN_MESSAGE;
    }
}
