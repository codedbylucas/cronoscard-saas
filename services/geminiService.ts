import { GoogleGenAI } from "@google/genai";
import { EventType } from "../types";

const getSystemInstruction = (type: EventType) => {
  switch (type) {
    case EventType.DUE:
      return "You are a financial assistant. Write a short, urgent but polite reminder message (max 150 chars) for a credit card bill due date. Portuguese language.";
    case EventType.CLOSING:
      return "You are a financial assistant. Write a short, informative message (max 150 chars) alerting that the credit card invoice is closing today. Portuguese language.";
    case EventType.PUSH:
      return "You are a marketing assistant. Write a short, exciting teaser message (max 150 chars) for a generic app notification or feature update. Portuguese language.";
    default:
      return "Write a short notification message in Portuguese.";
  }
};

export const generateTemplateMessage = async (type: EventType): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("Gemini API key missing");
    return "Erro: API key nao configurada.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const instruction = getSystemInstruction(type);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: "Generate one message now.",
      config: {
        systemInstruction: instruction,
        temperature: 0.7,
        maxOutputTokens: 60,
      }
    });

    return response.text?.trim() || "Nao foi possivel gerar a mensagem.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Erro ao conectar com a IA.";
  }
};
