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
// PENTING: Pastikan file .env ada dan berisi GEMINI_API_KEY
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


// function untuk penguraian respons API Gemini 
const extractText = (resp) => {
    try {
        const text = 
            resp?.response?.candidates?.[0]?.content?.parts?.[0]?.text ??
            resp?.candidates?.[0]?.content?.parts?.[0]?.text ??
            resp?.response?.candidates?.[0]?.content?.text;
        return text ?? JSON.stringify(resp, null, 2);
    } catch (err) {
        console.error("Error extracting text: ", err);
        return JSON.stringify(resp, null, 2)
    }
}
// --- Rute Aplikasi ---

// Rute utama untuk menyajikan halaman chat
app.get('/', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

// Rute API untuk Chat
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: "Request body must include a non-empty 'messages' array." });
        }

        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        const lastUserMessage = messages[messages.length - 1].content;
        const result = await model.generateContent(lastUserMessage);

        res.json({ result: result.response.text() });
    } catch (error) {
        console.error("\n===================================");
        console.error("Error di endpoint /api/chat:");
        console.error(error); // Log seluruh objek error untuk debugging
        console.error("===================================\n");
        res.status(500).json({ error: "Gagal mendapatkan respons dari AI. Periksa log server untuk detail." });
    }
});

// endpoint /generate-text
app.post('/generate-text', async (req, res) => {
    try {
        const { prompt } = req.body;
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        const result = await model.generateContent(prompt);
        res.json({ result: extractText(result) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});



app.listen(PORT, () => console.log(`Server berjalan di http://localhost:${PORT}`));