import "dotenv/config";
import express from "express";
import cors from 'cors';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from "@google/generative-ai";


// --- Konfigurasi Server ---
const app = express();
const PORT = process.env.PORT || 3000;

// -- Konfigurasi upload
const upload = multer();

// Dapatkan path direktori saat ini (penting untuk ES Modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.join(__dirname, 'public');

// --- Konfigurasi Gemini AI ---
if (!process.env.GEMINI_API_KEY) {
    console.error("\nFATAL ERROR: Variabel GEMINI_API_KEY tidak ditemukan.");
    console.error("Pastikan Anda telah membuat file .env di root direktori proyek.");
    console.error("Isi file .env harus: GEMINI_API_KEY=kunci_api_anda\n");
    process.exit(1); // Hentikan aplikasi jika API key tidak ada
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const GEMINI_MODEL = "gemini-1.5-flash-latest";

// --- Middleware ---
app.use(cors()); // Mengizinkan permintaan dari origin lain
app.use(express.json()); // Mem-parsing body JSON dari request
app.use(express.static(publicPath)); // Menyajikan file statis (HTML, CSS, JS) dari folder 'public'

// --- Rute Aplikasi ---

// Rute utama untuk menyajikan halaman chat
app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

// Rute API untuk Chat
// Endpoint untuk menangani :
// 1. Chat teks-saja (jika tidak ada file yang diunggah)
// 2. Chat dengan file (gambar, dokumen, audio, dll.)
app.post('/api/chat', upload.single('file'), async (req, res) => {
    try {
        // 'prompt' datang dari form-data, bukan JSON body
        const { prompt } = req.body;
        const file = req.file;

        if (!prompt) {
            return res.status(400).json({ error: "Request body must include a 'prompt'." });
        }

        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        let result;
        let responseText;

        if (file) {
            // Kasus 2: Permintaan dengan file (multimodal)
            const filePart = {
                inlineData: {
                    data: file.buffer.toString("base64"),
                    mimeType: file.mimetype,
                },
            };
            result = await model.generateContent([prompt, filePart]);
        } else {
            // Kasus 1: Permintaan teks-saja
            result = await model.generateContent(prompt);
        }

        responseText = result.response.text();
        res.json({ result: responseText });

    } catch (error) {
        console.error("\n===================================");
        console.error("Error di endpoint /api/chat:");
        console.error(error);
        console.error("===================================\n");
        res.status(500).json({ error: "Gagal mendapatkan respons dari AI. Periksa log server untuk detail." });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan dan dapat diakses di:`);
    console.log(`- Local:   http://localhost:${PORT}`);
    console.log(`- Network: http://192.168.0.100:${PORT}`);
});