package fr.acousmatictheatre.mises;

import android.Manifest;
import android.app.Activity;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.pdf.PdfDocument;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintDocumentInfo;
import android.print.PrintManager;
import android.print.pdf.PrintedPdfDocument;
import android.os.Build;
import android.provider.Settings;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.lang.reflect.Method;
import java.util.Set;
import java.util.UUID;

public final class NativePrinterBridge {
    static final int BLUETOOTH_PERMISSION_REQUEST = 2201;
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    private static final int WIDTH = 384;

    private final Activity activity;
    private final WebView webView;

    NativePrinterBridge(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
    }

    private boolean hasConnectPermission() {
        return Build.VERSION.SDK_INT < 31 || activity.checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean ensureConnectPermission() {
        if (hasConnectPermission()) return true;
        activity.runOnUiThread(() -> activity.requestPermissions(new String[]{Manifest.permission.BLUETOOTH_CONNECT}, BLUETOOTH_PERMISSION_REQUEST));
        emit("Autorise l’accès Bluetooth, puis retouche Imprimante.");
        return false;
    }

    @JavascriptInterface
    public String listPairedPrinters() {
        JSONArray result = new JSONArray();
        if (!ensureConnectPermission()) return result.toString();
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter == null || !adapter.isEnabled()) return result.toString();
        try {
            Set<BluetoothDevice> devices = adapter.getBondedDevices();
            for (BluetoothDevice device : devices) {
                JSONObject item = new JSONObject();
                String name = device.getName() == null ? "Bluetooth" : device.getName();
                item.put("name", name);
                item.put("address", device.getAddress());
                String upper = name.toUpperCase();
                item.put("likelyPrinter", upper.contains("YHK") || upper.contains("MINI") || upper.contains("PRINT") || upper.contains("CTP") || upper.contains("X6") || upper.contains("SC03") || upper.contains("SC04"));
                result.put(item);
            }
        } catch (Exception e) {
            emit("Lecture Bluetooth impossible : " + safeMessage(e));
        }
        return result.toString();
    }

    @JavascriptInterface
    public void openBluetoothSettings() {
        activity.runOnUiThread(() -> {
            try { activity.startActivity(new Intent(Settings.ACTION_BLUETOOTH_SETTINGS)); }
            catch (Exception e) { emit("Impossible d’ouvrir les réglages Bluetooth."); }
        });
    }

    @JavascriptInterface
    public void printWithSystem(String jobName, String dataUrl) {
        final String safeName = jobName == null || jobName.trim().isEmpty() ? "MISES !" : jobName.trim();
        final Bitmap bitmap = decodeDataUrl(dataUrl);
        if (bitmap == null) {
            emit("Étiquette illisible pour l’impression Android.");
            return;
        }
        activity.runOnUiThread(() -> {
            PrintManager printManager = (PrintManager) activity.getSystemService(Context.PRINT_SERVICE);
            if (printManager == null) {
                emit("Service d’impression Android indisponible.");
                bitmap.recycle();
                return;
            }
            String job = safeName.length() > 80 ? safeName.substring(0, 80) : safeName;
            PrintAttributes attributes = new PrintAttributes.Builder()
                    .setMediaSize(PrintAttributes.MediaSize.ISO_A6)
                    .setMinMargins(PrintAttributes.Margins.NO_MARGINS)
                    .setColorMode(PrintAttributes.COLOR_MODE_MONOCHROME)
                    .build();
            printManager.print(job, new LabelPrintAdapter(activity, job, bitmap), attributes);
            emit("Impression Android lancée : " + job);
        });
    }

    @JavascriptInterface
    public void printImages(String address, String jsonDataUrls) {
        if (!ensureConnectPermission()) return;
        new Thread(() -> {
            BluetoothSocket socket = null;
            try {
                JSONArray images = new JSONArray(jsonDataUrls);
                if (images.length() == 0) throw new IllegalArgumentException("Aucune étiquette à imprimer");
                BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
                if (adapter == null || !adapter.isEnabled()) throw new IllegalStateException("Bluetooth désactivé");
                BluetoothDevice device = adapter.getRemoteDevice(address);
                emit("Connexion à " + (device.getName() == null ? address : device.getName()) + "…");
                try { adapter.cancelDiscovery(); }
                catch (SecurityException ignored) { /* API 31+ : pas de scan, seulement un appareil déjà appairé. */ }
                socket = connect(device);
                OutputStream out = socket.getOutputStream();
                for (int i = 0; i < images.length(); i++) {
                    Bitmap bitmap = decodeDataUrl(images.getString(i));
                    if (bitmap == null) throw new IllegalArgumentException("Image d’étiquette illisible");
                    writeYhkRaster(out, bitmap);
                    bitmap.recycle();
                    Thread.sleep(250);
                }
                out.flush();
                emit(images.length() == 1 ? "Étiquette envoyée à l’imprimante." : images.length() + " étiquettes envoyées à l’imprimante.");
            } catch (Exception e) {
                emit("Impression impossible : " + safeMessage(e));
            } finally {
                if (socket != null) try { socket.close(); } catch (Exception ignored) {}
            }
        }, "MISES-YHK-Printer").start();
    }

    private BluetoothSocket connect(BluetoothDevice device) throws Exception {
        Exception first = null;
        try {
            BluetoothSocket socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
            socket.connect();
            return socket;
        } catch (Exception e) { first = e; }
        try {
            Method method = device.getClass().getMethod("createRfcommSocket", int.class);
            BluetoothSocket socket = (BluetoothSocket) method.invoke(device, 2);
            socket.connect();
            return socket;
        } catch (Exception second) {
            throw new IllegalStateException("connexion SPP/RFCOMM refusée" + (first == null ? "" : " (" + safeMessage(first) + ")"), second);
        }
    }

    private Bitmap decodeDataUrl(String dataUrl) {
        int comma = dataUrl.indexOf(',');
        String base64 = comma >= 0 ? dataUrl.substring(comma + 1) : dataUrl;
        byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
        return BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
    }

    private void writeYhkRaster(OutputStream out, Bitmap source) throws Exception {
        Bitmap raster = prepareBitmap(source);
        int height = raster.getHeight();
        int bytesPerRow = WIDTH / 8;
        ByteArrayOutputStream data = new ByteArrayOutputStream(bytesPerRow * height);
        int[] row = new int[WIDTH];
        for (int y = 0; y < height; y++) {
            // Rotate 180° to match the WalkPrint/YHK paper exit orientation.
            raster.getPixels(row, 0, WIDTH, 0, height - 1 - y, WIDTH, 1);
            for (int xb = 0; xb < bytesPerRow; xb++) {
                int value = 0;
                for (int bit = 0; bit < 8; bit++) {
                    int color = row[WIDTH - 1 - (xb * 8 + bit)];
                    int luminance = (Color.red(color) * 299 + Color.green(color) * 587 + Color.blue(color) * 114) / 1000;
                    if (luminance < 150) value |= (0x80 >> bit);
                }
                data.write(value);
            }
        }

        out.write(new byte[]{0x1b, 0x40}); // ESC @ : initialise
        out.flush();
        Thread.sleep(180);
        out.write(new byte[]{0x1d, 0x49, (byte)0xf0, 0x19}); // observed YHK start sequence
        out.flush();
        Thread.sleep(180);
        out.write(new byte[]{0x1d, 0x76, 0x30, 0x00, 0x30, 0x00, (byte)(height & 0xff), (byte)((height >> 8) & 0xff)}); // GS v 0, 384 px
        out.write(data.toByteArray());
        out.write(new byte[]{0x0a,0x0a,0x0a,0x0a});
        out.flush();
        raster.recycle();
    }

    private Bitmap prepareBitmap(Bitmap source) {
        float scale = Math.min(1f, WIDTH / (float) source.getWidth());
        int targetWidth = Math.max(1, Math.round(source.getWidth() * scale));
        int targetHeight = Math.max(1, Math.round(source.getHeight() * scale));
        Bitmap scaled = Bitmap.createScaledBitmap(source, targetWidth, targetHeight, true);
        Bitmap canvasBitmap = Bitmap.createBitmap(WIDTH, targetHeight, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(canvasBitmap);
        canvas.drawColor(Color.WHITE);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
        canvas.drawBitmap(scaled, Math.max(0, (WIDTH - targetWidth) / 2f), 0, paint);
        if (scaled != source) scaled.recycle();
        return canvasBitmap;
    }

    void onPermissionResult(boolean granted) {
        emit(granted ? "Bluetooth autorisé · choisis maintenant l’imprimante." : "Accès Bluetooth refusé.");
    }

    private void emit(String message) {
        final String script = "window.dispatchEvent(new CustomEvent('mises-native-printer-status',{detail:" + JSONObject.quote(message) + "}))";
        webView.post(() -> webView.evaluateJavascript(script, null));
    }

    private static String safeMessage(Throwable error) {
        String message = error.getMessage();
        return message == null || message.trim().isEmpty() ? error.getClass().getSimpleName() : message;
    }

    private static final class LabelPrintAdapter extends PrintDocumentAdapter {
        private final Context context;
        private final String name;
        private final Bitmap bitmap;
        private PrintAttributes attributes;

        LabelPrintAdapter(Context context, String name, Bitmap bitmap) {
            this.context = context;
            this.name = name;
            this.bitmap = bitmap;
        }

        @Override
        public void onLayout(PrintAttributes oldAttributes, PrintAttributes newAttributes, CancellationSignal cancellationSignal, LayoutResultCallback callback, Bundle extras) {
            if (cancellationSignal.isCanceled()) {
                callback.onLayoutCancelled();
                return;
            }
            attributes = newAttributes;
            callback.onLayoutFinished(new PrintDocumentInfo.Builder(name + ".pdf")
                    .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT)
                    .setPageCount(1)
                    .build(), true);
        }

        @Override
        public void onWrite(PageRange[] pages, ParcelFileDescriptor destination, CancellationSignal cancellationSignal, WriteResultCallback callback) {
            PrintedPdfDocument document = new PrintedPdfDocument(context, attributes);
            try {
                if (cancellationSignal.isCanceled()) {
                    callback.onWriteCancelled();
                    return;
                }
                PdfDocument.Page page = document.startPage(0);
                Canvas canvas = page.getCanvas();
                canvas.drawColor(Color.WHITE);
                float scale = Math.min(canvas.getWidth() / (float) bitmap.getWidth(), canvas.getHeight() / (float) bitmap.getHeight());
                float width = bitmap.getWidth() * scale;
                float height = bitmap.getHeight() * scale;
                float left = (canvas.getWidth() - width) / 2f;
                float top = (canvas.getHeight() - height) / 2f;
                canvas.drawBitmap(bitmap, null, new RectF(left, top, left + width, top + height), null);
                document.finishPage(page);
                document.writeTo(new FileOutputStream(destination.getFileDescriptor()));
                callback.onWriteFinished(new PageRange[]{PageRange.ALL_PAGES});
            } catch (Exception error) {
                callback.onWriteFailed(error.getMessage() == null ? "Impression impossible" : error.getMessage());
            } finally {
                document.close();
            }
        }

        @Override
        public void onFinish() {
            if (!bitmap.isRecycled()) bitmap.recycle();
        }
    }
}
