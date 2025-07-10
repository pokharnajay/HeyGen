import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { toFile } from "openai/uploads";   // ➜ add this

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const language = (form.get("lang") as string | null) ?? "en";

  if (!file) {
    return NextResponse.json({ error: "No audio file" }, { status: 400 });
  }

  // Turn the incoming File → Buffer
  const buffer = Buffer.from(await file.arrayBuffer());

  const transcription = await openai.audio.transcriptions.create({
    file: await toFile(buffer, "speech.webm"),   // ✅ proper File-like object
    model: "whisper-1",
    language,
    response_format: "json",
  });

  return NextResponse.json({ text: transcription.text.trim() });
}
