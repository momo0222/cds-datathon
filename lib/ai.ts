import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

/*
MODEL STRATEGY
mini  -> cheap + fast
full  -> stronger reasoning
*/

export type AIModel = "mini" | "full"

const MODELS: Record<AIModel, string> = {
  mini: "gpt-4.1-mini",
  full: "gpt-4.1"
}

export interface AIRequest {
  system: string
  prompt: string
  model?: AIModel
  temperature?: number
  maxTokens?: number
}

/*
Main shared AI function
*/
export async function askAI(req: AIRequest) {
  const response = await openai.chat.completions.create({
    model: MODELS[req.model ?? "mini"],
    temperature: req.temperature ?? 0,
    max_tokens: req.maxTokens ?? 1024,
    messages: [
      { role: "system", content: req.system },
      { role: "user", content: req.prompt }
    ]
  })

  const text = response.choices?.[0]?.message?.content ?? ""

  return {
    text,
    usage: response.usage,
    model: req.model ?? "mini"
  }
}

/*
Structured JSON request
(more reliable than parsing markdown)
*/
export async function askAIJSON<T>(req: AIRequest): Promise<T> {
  const response = await openai.chat.completions.create({
    model: MODELS[req.model ?? "mini"],
    temperature: req.temperature ?? 0,
    max_tokens: req.maxTokens ?? 1024,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: req.system },
      { role: "user", content: req.prompt }
    ]
  })

  const text = response.choices?.[0]?.message?.content ?? "{}"
  const finishReason = response.choices?.[0]?.finish_reason

  try {
    return JSON.parse(text) as T
  } catch (e) {
    if (finishReason === "length") {
      throw new Error("AI response was truncated (token limit reached). Try a shorter trip or fewer details.")
    }
    console.error("AI JSON parse failed:", text.slice(-200))
    throw new Error("AI returned invalid JSON")
  }
}

/*
Optional: safe JSON parser fallback
*/
export function parseJSON<T>(text: string): T {
  try {
    const clean = text.replace(/```json\n?|```/g, "").trim()
    return JSON.parse(clean)
  } catch (e) {
    console.error("JSON parse failed:", text)
    throw new Error("AI returned invalid JSON")
  }
}