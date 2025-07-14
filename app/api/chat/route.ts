import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import pdf from "pdf-parse";
import mammoth from "mammoth";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const messages = JSON.parse(formData.get("messages") as string);
  const file = formData.get("file") as File | null;

  let fileContent = "";
  if (file) {
    const buffer = Buffer.from(await file.arrayBuffer());
    if (file.type === "application/pdf") {
      const data = await pdf(buffer);
      fileContent = data.text;
    } else if (
      file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({ buffer });
      fileContent = result.value;
    } else {
      fileContent = buffer.toString("utf-8");
    }
  }

  const systemMessage: ChatCompletionMessageParam = {
    role: "system",
    content: `You are a helpful assistant. Here is a file with additional context:\n\n${fileContent}`,
  };

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [systemMessage, ...messages],
    });

    return NextResponse.json({
      message: response.choices[0].message.content,
    });
  } catch (error) {
    console.error("OpenAI API error:", error);
    return NextResponse.json(
      { error: "Error processing your request" },
      { status: 500 }
    );
  }
}