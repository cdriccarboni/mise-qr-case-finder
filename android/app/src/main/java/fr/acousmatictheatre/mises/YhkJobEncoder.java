package fr.acousmatictheatre.mises;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * Encodeur pur Java (sans API Android, testable sur la box) d'UN job YHK/WalkPrint par étiquette.
 * Cause #45 (beta.26) : toute l'étiquette partait en un seul bloc GS v 0 de ~1100 lignes, sans contrôle
 * de flux ; le tampon de l'imprimante débordait, la fin du bloc (le QR, imprimé en dernier à cause de la
 * rotation 180°) était tronquée, puis le ESC @ du job suivant / la fermeture du socket effaçait le reste.
 * Ici : bandes de BAND_ROWS lignes, chacune un GS v 0 autonome, envoyées une par une avec pause ;
 * blanc de coupe (~10 mm) + pointillé fin avant et après, sans toucher l'étiquette approuvée.
 */
public final class YhkJobEncoder {
    public static final int WIDTH = 384;
    public static final int BYTES_PER_ROW = WIDTH / 8;
    public static final int BAND_ROWS = 64;          // 3 Ko par bande : bien sous le tampon YHK
    public static final int CUT_MARGIN_DOTS = 80;    // 10 mm à 8 pts/mm
    public static final int THRESHOLD = 150;

    private YhkJobEncoder() {}

    /** Rangées 1-bit (déjà tournées 180°) de l'étiquette, encadrées par les marges de coupe. */
    public static byte[][] rows(int[] argb, int width, int height) {
        if (width != WIDTH) throw new IllegalArgumentException("largeur " + width + " ≠ " + WIDTH);
        int total = height + 2 * CUT_MARGIN_DOTS;
        byte[][] out = new byte[total][BYTES_PER_ROW];
        cutLine(out[CUT_MARGIN_DOTS / 2]);
        cutLine(out[total - 1 - CUT_MARGIN_DOTS / 2]);
        for (int y = 0; y < height; y++) {
            int src = height - 1 - y; // rotation 180° : sens de sortie du papier
            byte[] row = out[CUT_MARGIN_DOTS + y];
            for (int x = 0; x < WIDTH; x++) {
                int c = argb[src * width + (WIDTH - 1 - x)];
                int lum = (((c >> 16) & 0xff) * 299 + ((c >> 8) & 0xff) * 587 + (c & 0xff) * 114) / 1000;
                if (lum < THRESHOLD) row[x >> 3] |= (byte) (0x80 >> (x & 7));
            }
        }
        return out;
    }

    private static void cutLine(byte[] row) {
        for (int x = 16; x < WIDTH - 16; x++) if ((x / 8) % 2 == 0) row[x >> 3] |= (byte) (0x80 >> (x & 7));
    }

    /** Morceaux à écrire dans l'ordre, avec une pause entre chaque (voir NativePrinterBridge). */
    public static List<byte[]> chunks(int[] argb, int width, int height) {
        byte[][] rows = rows(argb, width, height);
        List<byte[]> list = new ArrayList<>();
        list.add(new byte[]{0x1b, 0x40});                    // ESC @
        list.add(new byte[]{0x1d, 0x49, (byte) 0xf0, 0x19}); // séquence YHK observée
        for (int start = 0; start < rows.length; start += BAND_ROWS) {
            int n = Math.min(BAND_ROWS, rows.length - start);
            ByteArrayOutputStream b = new ByteArrayOutputStream(8 + n * BYTES_PER_ROW);
            b.write(0x1d); b.write(0x76); b.write(0x30); b.write(0x00);
            b.write(BYTES_PER_ROW & 0xff); b.write(0x00); b.write(n & 0xff); b.write((n >> 8) & 0xff);
            for (int i = 0; i < n; i++) b.write(rows[start + i], 0, BYTES_PER_ROW);
            list.add(b.toByteArray());
        }
        list.add(new byte[]{0x0a, 0x0a});
        return list;
    }

    /** Temps d'impression estimé d'un job (≈ 40 mm/s), pour attendre avant le job suivant / la fermeture. */
    public static long printMillis(int height) {
        return 600L + (height + 2L * CUT_MARGIN_DOTS) * 1000L / 320L;
    }

    /** Petite CLI de test : lit width,height puis argb (int32 BE) sur stdin, écrit les octets du job sur stdout. */
    public static void main(String[] args) throws Exception {
        java.io.DataInputStream in = new java.io.DataInputStream(new java.io.BufferedInputStream(System.in));
        java.io.OutputStream out = new java.io.BufferedOutputStream(System.out);
        int jobs = in.readInt();
        for (int j = 0; j < jobs; j++) {
            int w = in.readInt(), h = in.readInt();
            int[] px = new int[w * h];
            for (int i = 0; i < px.length; i++) px[i] = in.readInt();
            for (byte[] c : chunks(px, w, h)) out.write(c);
        }
        out.flush();
    }
}
