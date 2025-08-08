import OpenAI from "openai";

let singletonClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!singletonClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    singletonClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return singletonClient;
}

export default getOpenAIClient();


