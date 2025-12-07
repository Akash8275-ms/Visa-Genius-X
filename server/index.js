
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Set up Multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Gemini API
const genAI = new GoogleGenerativeAI((process.env.GEMINI_API_KEY || '').trim());

const PORT = 3000;

app.get('/', (req, res) => {
    res.send('Visa Genius Backend Running');
});

// Helper function to process file buffer for Gemini
function fileToGenerativePart(buffer, mimeType) {
    return {
        inlineData: {
            data: buffer.toString('base64'),
            mimeType,
        },
    };
}

app.post('/api/analyze', upload.any(), async (req, res) => {
    try {
        const profile = req.body;
        const files = req.files;

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'Server configuration error: GEMINI_API_KEY is missing.' });
        }

        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        console.log('Analyzing profile:', profile.name);
        console.log('Files received:', files.map(f => f.originalname));

        // Prepare prompt
        const prompt = `
      You are an expert Visa Officer AI. Analyze the following visa application based on the profile details and the provided documents.
      
      Profile Details:
      ${JSON.stringify(profile, null, 2)}
      
      The user has uploaded ${files.length} documents.
      
      Your task is to:
      1. Validate the documents (check if they seem authentic, readable, and relevant to the profile).
      2. Identify what documents were provided (e.g., Passport, Bank Statement).
      3. Calculate a "Visa Success Probability" score (0-100) based on the strength of the profile and documents.
      4. Provide specific reasons for the score.
      5. Identify any risks.
      6. Compare the profile against typical requirements for: ${profile.dest_country || 'Destination Country'}.
      
      Return the response ONLY in valid JSON format with the following structure:
      {
        "score": number (0-100),
        "plain": "String rating (e.g., High, Moderate, Low)",
        "reasons": ["reason 1", "reason 2"],
        "docs": [
          { "name": "Document Name (identified)", "ok": boolean, "note": "Validation note" }
        ],
        "twin": {
          "name": "Applicant Name",
          "confidence": number (0-100 confidence in analysis),
          "traits": ["trait 1", "trait 2"]
        },
        "countries": [
          { "name": "${profile.dest_country || 'Destination'}", "score": number, "flag": "FlagEmoji", "reason": "Specific reason" }
        ],
        "risk": [
          { "label": "Finances", "value": number (0-100 risk) },
          { "label": "Docs", "value": number },
          { "label": "Intent", "value": number },
          { "label": "History", "value": number }
        ]
      }
      
      Do not include markdown code blocks. Just the raw JSON string.
    `;

        // Prepare parts for direct API call
        const contents = [
            {
                role: "user",
                parts: [
                    { text: prompt },
                    ...files.map(file => ({
                        inline_data: {
                            mime_type: file.mimetype,
                            data: file.buffer.toString('base64')
                        }
                    }))
                ]
            }
        ];

        const model = "gemini-flash-latest";
        const apiKey = (process.env.GEMINI_API_KEY || '').trim();
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ contents, generationConfig: { response_mime_type: "application/json" } })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini API Error: ${response.status} ${response.statusText} - ${errText}`);
        }

        const data = await response.json();
        const text = data.candidates[0].content.parts[0].text;

        // Clean up response if it contains markdown code blocks
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const jsonData = JSON.parse(cleanText);
            res.json(jsonData);
        } catch (e) {
            console.error('Failed to parse Gemini response:', text);
            res.status(500).json({ error: 'Failed to process analysis results', raw: text });
        }

    } catch (error) {
        console.error('Error processing request:', JSON.stringify(error, null, 2));
        if (error.response) {
            console.error('Error response:', JSON.stringify(error.response, null, 2));
        }
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
