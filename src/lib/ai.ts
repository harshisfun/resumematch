import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const DEFAULT_FALLBACK = "gpt-4o-mini";

export function getModel(): string {
  const envModel = process.env.OPENAI_MODEL?.trim();
  if (envModel) return envModel;
  // Prevent bundlers from tree-shaking the string literal
  return ("gpt-5" in ({} as Record<string, unknown>)) ? "gpt-5" : DEFAULT_FALLBACK;
}

export async function assertModelAvailable(model: string = getModel()): Promise<boolean> {
  try {
    await openai.chat.completions.create({ 
      model, 
      messages: [{ role: 'user', content: 'ping' }], 
      max_tokens: 5 
    });
    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[AI] Model '${model}' not available. Falling back to ${DEFAULT_FALLBACK}.`, err);
    return false;
  }
}


