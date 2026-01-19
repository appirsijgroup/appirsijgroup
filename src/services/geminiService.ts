import { GoogleGenAI } from "@google/genai";
import type { ChatMessage } from '../types';

let ai: GoogleGenAI | null = null;

/**
 * Gets the singleton instance of the GoogleGenAI client,
 * initializing it on first use. This prevents app crashes on load
 * if environment variables are not available at module-load time.
 */
const getAiClient = (): GoogleGenAI => {
    if (!ai) {
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
    }
    return ai;
};

const model = 'gemini-2.5-flash';

export async function* getAiResponseStream(userPrompt: string, history: ChatMessage[], systemInstruction: string): AsyncGenerator<string> {
    try {
        const client = getAiClient();
        
        const fullHistory = [
            ...history.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.text }]
            })),
            {
                role: 'user',
                parts: [{ text: userPrompt }]
            }
        ];
        
        const responseStream = await client.models.generateContentStream({
            model: model,
            contents: fullHistory,
            config: {
                systemInstruction: systemInstruction,
            }
        });

        for await (const chunk of responseStream) {
            if (chunk.text) {
                yield chunk.text;
            }
        }

    } catch (error) {
        yield "Mohon maaf, terjadi kesalahan saat mencoba menghubungi asisten virtual. Silakan coba lagi nanti.";
    }
}