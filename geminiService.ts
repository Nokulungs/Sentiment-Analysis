
import { GoogleGenAI, Type } from "@google/genai";
import { SentimentResult, ProviderType, SentimentAnalysis } from "./types";

const FLASH_MODEL = 'gemini-3-flash-preview';
const PRO_MODEL = 'gemini-3-pro-preview';

export const analyzeSentiment = async (
  texts: string[], 
  provider: ProviderType = 'flash'
): Promise<SentimentResult[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const isCompare = provider === 'compare';
  const modelToUse = provider === 'pro' || isCompare ? PRO_MODEL : FLASH_MODEL;

  const systemInstruction = isCompare 
    ? "You are a dual-engine sentiment analyzer. For each text, provide TWO separate analyses: one from a 'Standard' perspective and one from an 'Expert' perspective. They should be independent and reflect potential nuances."
    : `You are a sentiment analyzer acting as the ${provider.toUpperCase()} engine.`;

  const response = await ai.models.generateContent({
    model: modelToUse,
    contents: `Analyze the sentiment of the following ${texts.length} text segments. 
    Return a JSON array of objects. 
    Each top-level object must include:
    - text: The original text string.
    - analyses: An array of analysis objects. ${isCompare ? 'Length must be exactly 2.' : 'Length must be exactly 1.'}
    
    Each analysis object must include:
    - provider: ${isCompare ? '"Standard" or "Expert"' : `"${provider.toUpperCase()}"`}
    - sentiment: "Positive", "Negative", or "Neutral"
    - confidence: A number between 0 and 1
    - keywords: Array of 3 strings
    - explanation: Short logic summary

    Input texts:
    ${texts.map((t, i) => `${i + 1}. "${t}"`).join('\n')}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            analyses: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  provider: { type: Type.STRING },
                  sentiment: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                  keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                  explanation: { type: Type.STRING }
                },
                required: ["provider", "sentiment", "confidence", "keywords", "explanation"]
              }
            }
          },
          required: ["text", "analyses"]
        }
      }
    }
  });

  const jsonStr = response.text?.trim();
  if (!jsonStr) throw new Error("Empty response from AI");

  const results: any[] = JSON.parse(jsonStr);
  
  return results.map(r => ({
    ...r,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString()
  }));
};

export const getImprovementSuggestions = async (text: string): Promise<{
  improvedText: string;
  wordChanges: { original: string; suggested: string }[];
  reasoning: string;
}> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: FLASH_MODEL,
    contents: `The following text has a negative sentiment. Suggest an improved version that is more constructive and positive while maintaining the core message.
    
    Text: "${text}"
    
    Return a JSON object with:
    - improvedText: The rephrased positive version.
    - wordChanges: An array of objects with { original: string, suggested: string } for key negative words.
    - reasoning: A brief explanation of why the change helps.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          improvedText: { type: Type.STRING },
          wordChanges: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                suggested: { type: Type.STRING }
              },
              required: ["original", "suggested"]
            }
          },
          reasoning: { type: Type.STRING }
        },
        required: ["improvedText", "wordChanges", "reasoning"]
      }
    }
  });

  const jsonStr = response.text?.trim();
  if (!jsonStr) throw new Error("Could not generate suggestions.");
  return JSON.parse(jsonStr);
};
