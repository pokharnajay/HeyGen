// app/api/openai-chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getKnowledgeText } from "@/app/lib/heygen-kb";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions"; // Import the type

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const { prompt, model = "gpt-4o", wordLimit = 40, knowledgeId } = await req.json();

  const kbText = knowledgeId ? await getKnowledgeText(knowledgeId) : "";

  // Define messages with explicit typing
  const systemMessage: ChatCompletionMessageParam = {
    role: "system",
    content: `You are a helpful tutor. Use the knowledge below when relevant. Keep answers under ${wordLimit} words.`,
  };
  const kbMessage: ChatCompletionMessageParam | null = kbText
    ? { role: "system", content: `### KNOWLEDGE BASE ###\n${kbText}` }
    : null;
  const userMessage: ChatCompletionMessageParam = {
    role: "user",
    content: prompt,
  };

  // Construct the messages array, filtering out null values
  const messages: ChatCompletionMessageParam[] = [
    systemMessage,
    ...(kbMessage ? [kbMessage] : []),
    userMessage,
  ];

  const chat = await openai.chat.completions.create({
    model,
    messages,
    temperature: 0.7,
  });

  return NextResponse.json({ answer: chat.choices[0].message.content?.trim() ?? "" });
}