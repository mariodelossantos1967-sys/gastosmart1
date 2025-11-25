import { GoogleGenAI, Type } from "@google/genai";
import { ReceiptData, ChatMessage } from "../types";

const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Feature: Analyze images (Gemini 3 Pro Preview)
export const analyzeReceiptImage = async (base64Image: string): Promise<ReceiptData> => {
  const ai = getClient();
  
  // Prompt for structured extraction
  const prompt = `
    Analiza esta imagen de una factura o recibo. 
    Extrae la siguiente información en formato JSON estricto:
    - total (número)
    - date (string en formato YYYY-MM-DD, si no hay año asume el actual)
    - merchant (nombre del comercio)
    - description (breve resumen de qué es, ej: "Compra supermercado")
    - category (sugiere una categoría entre: Alimentación, Transporte, Vivienda, Servicios, Entretenimiento, Salud, Compras, Otros)
    
    Responde ÚNICAMENTE con el objeto JSON. No incluyas markdown ('''json).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          },
          { text: prompt }
        ]
      },
      config: {
         // Although 3-pro supports schema, text prompting is often more robust for specific extractions in preview
         // We will try to parse the text response.
      }
    });

    const text = response.text || "{}";
    // Clean up markdown code blocks if present
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Error analyzing receipt:", error);
    throw new Error("No se pudo analizar la imagen. Intenta de nuevo.");
  }
};

// Feature: AI powered chatbot (Gemini 3 Pro Preview)
export const chatWithAdvisor = async (history: ChatMessage[], newMessage: string): Promise<string> => {
  const ai = getClient();
  
  // Convert generic chat history to gemini format if needed, or just use sendChat logic.
  // For simplicity in this stateless service, we'll use generateContent with system instruction context
  // or use the chat API. Let's use Chat API.
  
  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: "Eres un asesor financiero experto y amigable. Ayudas a los usuarios a optimizar sus gastos, entender sus finanzas y ahorrar dinero. Responde de manera concisa y útil."
    },
    history: history.filter(h => h.role !== 'model' || !h.isSearch).map(h => ({
      role: h.role,
      parts: [{ text: h.text }]
    }))
  });

  const result = await chat.sendMessage({ message: newMessage });
  return result.text || "Lo siento, no pude generar una respuesta.";
};

// Feature: Use Google Search data (Gemini 2.5 Flash)
export const searchFinancialWeb = async (query: string): Promise<{ text: string, sources?: any[] }> => {
  const ai = getClient();
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: query,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || "No se encontraron resultados.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    // Extract sources
    const sources = chunks
      .map((c: any) => c.web ? { title: c.web.title, uri: c.web.uri } : null)
      .filter((s: any) => s !== null);

    return { text, sources };
  } catch (error) {
    console.error("Search error:", error);
    return { text: "Hubo un error al buscar en la web.", sources: [] };
  }
};