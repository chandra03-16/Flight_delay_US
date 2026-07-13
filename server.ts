import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialize Gemini client to avoid crashes on startup if key is missing
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in the Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// AI Mentor chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, systemInstruction } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "Invalid messages array provided." });
      return;
    }

    const ai = getGeminiClient();
    
    // Format messages for the @google/genai chats API
    // The format should be compatible with ai.chats.create
    const chat = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction: systemInstruction || "You are an expert Data Analyst Mentor and Portfolio Coach. Help the user build and discuss their Flight Delay portfolio project.",
        temperature: 0.7,
      }
    });

    // Send the last message, but wait, the chat object supports maintaining history.
    // Let's send the conversation. To do this simply, we can just use generateContent with the full conversation
    // or use chat.sendMessage. Let's see: if we use generateContent, we can construct the contents list:
    // [{ role: 'user', parts: [{ text: '...' }] }, ...]
    const contents = messages.map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction: systemInstruction || "You are an expert Data Analyst Mentor and Portfolio Coach. Help the user understand Excel data cleaning, SQL query optimization, Power BI dashboard design, and how to structure their resume or talk about flight delays in a job interview. Keep answers highly professional, structured, and friendly. Avoid fluff.",
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ 
      error: error.message || "An error occurred with the AI Coach.",
      isMissingKey: !process.env.GEMINI_API_KEY 
    });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
