package fr.acousmatictheatre.mises;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.webkit.WebViewAssetLoader;

import java.io.ByteArrayInputStream;
import java.util.Collections;

public final class MainActivity extends Activity {
    private static final int MEDIA_PERMISSION_REQUEST = 2101;
    private static final int FILE_CHOOSER_REQUEST = 2102;
    private static final String MISE_ORIGIN = "https://cdriccarboni.github.io";
    private static final String PWA_HOST = "cdriccarboni.github.io";
    private static final String PWA_PATH = "/mise-qr-case-finder";
    private static final String SUPABASE_HOST = "jemqozyqqsgabljnhfvn.supabase.co";
    private WebView webView;
    private ValueCallback<Uri[]> fileCallback;
    private NativePrinterBridge printerBridge;
    private int safeTop;
    private int safeRight;
    private int safeBottom;
    private int safeLeft;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        // Pas de coque Capacitor : la barre d’état, l’encoche, la navigation et le clavier
        // passent par WindowInsets, une seule fois, en padding de la WebView.
        // La PWA utilise env(safe-area-inset-*) ; data-native-safe évite de les ajouter encore.
        // Bord à bord Android 15 (targetSdk 36). androidx.core 1.15 n’a pas enableEdgeToEdge.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        if (Build.VERSION.SDK_INT >= 29) {
            getWindow().setStatusBarContrastEnforced(false);
            getWindow().setNavigationBarContrastEnforced(false);
        }
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().getAttributes().layoutInDisplayCutoutMode =
                    android.view.WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_ALWAYS;
        }

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(20, 19, 17));
        setContentView(webView);
        printerBridge = new NativePrinterBridge(this, webView);
        webView.addJavascriptInterface(printerBridge, "MisesAndroidPrinter");
        webView.addJavascriptInterface(new AndroidShellBridge(this), "MisesAndroid");

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUserAgentString(settings.getUserAgentString() + " MISES-Android/0.4.0-beta.13");

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        ViewCompat.setOnApplyWindowInsetsListener(webView, (view, windowInsets) -> {
            int barsAndCutout = WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout();
            Insets bars = windowInsets.getInsets(barsAndCutout);
            Insets ime = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
            safeTop = bars.top;
            safeRight = bars.right;
            safeBottom = Math.max(bars.bottom, ime.bottom);
            safeLeft = bars.left;
            view.setPadding(safeLeft, safeTop, safeRight, safeBottom);
            publishNativeSafe();
            return WindowInsetsCompat.CONSUMED;
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                publishNativeSafe();
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (isGoogleAuthHost(request.getUrl())) {
                    return new WebResourceResponse("text/plain", "utf-8", 403, "Forbidden", Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
                }
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String localCallback = localCallbackUrl(uri);
                if (localCallback != null) {
                    view.loadUrl(localCallback);
                    return true;
                }
                if (staysInApp(uri)) return false;
                openExternal(uri);
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED ||
                        checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                        requestPermissions(new String[]{Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO}, MEDIA_PERMISSION_REQUEST);
                        request.deny();
                        return;
                    }
                    request.grant(request.getResources());
                });
            }

            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    startActivityForResult(params.createIntent(), FILE_CHOOSER_REQUEST);
                } catch (ActivityNotFoundException e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });

        if (state == null) {
            webView.loadUrl(localUrlFor(getIntent()));
        } else {
            webView.restoreState(state);
        }
        ViewCompat.requestApplyInsets(webView);
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,
                    this::handleSystemBack
            );
        }
    }

    void applyAppColor(String hex) {
        runOnUiThread(() -> {
            if (hex == null || !hex.matches("^#[0-9A-Fa-f]{6}$")) return;
            try {
                int color = Color.parseColor(hex);
                getWindow().setStatusBarColor(color);
                getWindow().setNavigationBarColor(color);
                if (webView != null) webView.setBackgroundColor(color);
                setTaskDescription(new android.app.ActivityManager.TaskDescription(
                        getString(R.string.app_name), null, color
                ));
                boolean light = (
                        Color.red(color) * 0.299
                                + Color.green(color) * 0.587
                                + Color.blue(color) * 0.114
                ) > 170;
                WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(), webView);
                controller.setAppearanceLightStatusBars(light);
                controller.setAppearanceLightNavigationBars(light);
            } catch (IllegalArgumentException ignored) {}
        });
    }

    private void publishNativeSafe() {
        if (webView == null) return;
        webView.evaluateJavascript(
                "(function(){var d=document.documentElement;d.dataset.nativeSafe='1';var r=d.style;"
                        + "r.setProperty('--android-safe-top','0px');"
                        + "r.setProperty('--android-safe-right','0px');"
                        + "r.setProperty('--android-safe-bottom','0px');"
                        + "r.setProperty('--android-safe-left','0px');})()",
                null);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (webView != null && intent != null && intent.getData() != null) {
            webView.loadUrl(localUrlFor(intent));
        }
    }

    private String localUrlFor(Intent intent) {
        String base = getString(R.string.mise_url);
        if (intent == null || intent.getData() == null) return base;
        Uri data = intent.getData();
        if (isSupabaseVerifyUrl(data)) return data.toString();
        String callback = localCallbackUrl(data);
        return callback == null ? base : callback;
    }

    private String localCallbackUrl(Uri uri) {
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();
        String path = uri.getPath() == null ? "" : uri.getPath();
        if (!"https".equals(scheme) || !PWA_HOST.equals(host) || !path.startsWith(PWA_PATH)) return null;
        StringBuilder result = new StringBuilder(getString(R.string.mise_url));
        String query = uri.getEncodedQuery();
        String fragment = uri.getEncodedFragment();
        if (query != null && !query.isEmpty()) result.append('?').append(query);
        if (fragment != null && !fragment.isEmpty()) result.append('#').append(fragment);
        return result.toString();
    }

    private boolean staysInApp(Uri uri) {
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();
        return "appassets.androidplatform.net".equals(host) || SUPABASE_HOST.equals(host);
    }

    private static boolean isSupabaseVerifyUrl(Uri uri) {
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();
        String path = uri.getPath() == null ? "" : uri.getPath();
        return "https".equals(scheme) && SUPABASE_HOST.equals(host) && path.startsWith("/auth/v1/verify");
    }

    private static boolean isGoogleAuthHost(Uri uri) {
        String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase();
        return host.equals("accounts.google.com")
                || host.equals("googleapis.com")
                || host.endsWith(".googleapis.com")
                || host.equals("gstatic.com")
                || host.endsWith(".gstatic.com");
    }

    private void openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException ignored) {}
    }

    private void performBrowserBackOrExit() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else finish();
    }

    private void handleSystemBack() {
        if (webView == null) {
            finish();
            return;
        }
        webView.evaluateJavascript(
                "(function(){try{return !!(window.__mise&&window.__mise.handleBack&&window.__mise.handleBack())}catch(e){return false}})()",
                handled -> {
                    if (!"true".equals(handled)) performBrowserBackOrExit();
                }
        );
    }

    @Override
    public void onBackPressed() {
        handleSystemBack();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST && fileCallback != null) {
            Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            fileCallback.onReceiveValue(results);
            fileCallback = null;
        }
    }
    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == NativePrinterBridge.BLUETOOTH_PERMISSION_REQUEST && printerBridge != null) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            printerBridge.onPermissionResult(granted);
        }
    }

}
