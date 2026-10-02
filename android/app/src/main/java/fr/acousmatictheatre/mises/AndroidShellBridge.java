package fr.acousmatictheatre.mises;

import android.webkit.JavascriptInterface;

/** Signale à la PWA que l’identification Google ne doit pas démarrer dans cette WebView. */
public final class AndroidShellBridge {
    private final MainActivity activity;

    public AndroidShellBridge(MainActivity activity) {
        this.activity = activity;
    }

    static final String GOOGLE_SIGN_IN_MESSAGE =
            "La connexion Google directe n’est pas encore disponible dans la coque Android. "
                    + "Ouvre MISES ! dans Chrome depuis le bouton proposé pour raccorder Google Drive. "
                    + "Tes objets, photos et mémos locaux restent sur cet appareil tant que la synchronisation native Android n’est pas configurée.";

    @JavascriptInterface
    public boolean googleSignInAvailable() {
        return false;
    }

    @JavascriptInterface
    public String googleSignInMessage() {
        return GOOGLE_SIGN_IN_MESSAGE;
    }

    @JavascriptInterface
    public void setAppColor(String hex) {
        activity.applyAppColor(hex);
    }
}
