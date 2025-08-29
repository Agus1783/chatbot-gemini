import "dotenv/config";
import express from "express";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const upload = multer();

const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);
const GEMINI_MODEL = "gemini-1.5-flash-latest"; // Use a valid and recent model name

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server berjalan di http://localhost:${PORT}`));

const extractText = (resp) => {
    try {
        // The new SDK has a helper function to get the text directly.
        const text = resp.response.text();
        return text;
    } catch (err) {
        console.error("Error extracting text from AI response:", err);
        return JSON.stringify(resp, null, 2);
    }
}

// 1. Generate Text
app.post('/generate-text', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: "Prompt is required" });
        }
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        const result = await model.generateContent(prompt);

        res.json({ result: extractText(result) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Generate from image
app.post('/generate-from-image', upload.single('image'), async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!req.file) {
            return res.status(400).json({ error: "Image file is required" });
        }
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

        const imagePart = {
            inlineData: {
                mimeType: req.file.mimetype,
                data: req.file.buffer.toString('base64'),
            },
        };

        const result = await model.generateContent([prompt || "Jelaskan gambar berikut", imagePart]);
        res.json({ result: extractText(result) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Generate from document
app.post('/generate-from-document', upload.single('document'), async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!req.file) {
            return res.status(400).json({ error: "Document file is required" });
        }
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

        const filePart = {
            inlineData: {
                mimeType: req.file.mimetype,
                data: req.file.buffer.toString('base64'),
            },
        };

        const result = await model.generateContent([prompt || "Jelaskan document berikut", filePart]);

        res.json({ result: extractText(result) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Generate from audio
app.post('/generate-from-audio', upload.single('audio'), async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!req.file) {
            return res.status(400).json({ error: "Audio file is required" });
        }
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

        const audioPart = {
            inlineData: {
                mimeType: req.file.mimetype,
                data: req.file.buffer.toString('base64'),
            },
        };

        const result = await model.generateContent([prompt || "Transkrip audio berikut", audioPart]);

        res.json({ result: extractText(result) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. endpoint post api/chat
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: "Messages must be a non-empty array" });
        }
        const contents = messages.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.content }]
        }));

        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        const result = await model.generateContent({ contents });

        res.json({ result: extractText(result) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});