// app/api/openai-chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getKnowledgeText } from "@/app/lib/heygen-kb"; 

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const { prompt, model = "gpt-4o", wordLimit = 40, knowledgeId } = await req.json();

  const kbText = knowledgeId ? await getKnowledgeText(knowledgeId) : "";

  // Create messages array with explicit role types
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: `You are a helpful tutor. Use the knowledge below when relevant. Keep answers under ${wordLimit} words.` },
  ];

  if (kbText) {
    messages.push({ role: "system", content: `### KNOWLEDGE BASE ###\n${kbText}` });
  }

  messages.push({ role: "user", content: prompt });

  const chat = await openai.chat.completions.create({
    model,
    messages,
    temperature: 0.7,
  });

  return NextResponse.json({ answer: chat.choices[0].message.content?.trim() ?? "" });
}