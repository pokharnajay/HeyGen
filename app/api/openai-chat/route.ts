// app/api/openai-chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getKnowledgeText } from "@/app/lib/heygen-kb"; 

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const { prompt, model = "gpt-4o", wordLimit = 40, knowledgeId } = await req.json();

  const kbText = knowledgeId ? await getKnowledgeText(knowledgeId) : "";

  const chat = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: `You are a helpful tutor. Use the knowledge below when relevant. Keep answers under ${wordLimit} words.` },
      ...(kbText ? [{ role:"system", content: `### KNOWLEDGE BASE ###\n${kbText}` }] : []),
      { role: "user", content: prompt }
    ],
    temperature: 0.7,
  });

  return NextResponse.json({ answer: chat.choices[0].message.content?.trim() ?? "" });
}