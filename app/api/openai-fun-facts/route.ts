// /app/api/openai-fun-facts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  console.log('Received POST request to /api/openai-fun-facts');

  const { course, age } = await request.json();
  if (!course || !age) {
    return NextResponse.json(
      { error: 'Course and age are required' },
      { status: 400 }
    );
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // keep server-side
  });

  try {
    const prompt = `
      You are an educational assistant. Based on the student's course "${course}" and age "${age}", 
      provide 4 fun facts or knowledge snippets related to the course. 
      Each fact should be 2-3 lines, engaging, and suitable for the student's age group. 
      Focus on insights that might be found in relevant articles or educational resources. 
      Return the facts in the following JSON format:
      {
        "facts": [
          "Fact 1 description",
          "Fact 2 description",
          "Fact 3 description"
          "Fact 4 description"
        ]
      }
      Ensure the response is valid JSON and contains at least 4 facts.
    `;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a concise educational assistant that responds in valid JSON." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content || "{}";
    console.log("Raw OpenAI response:", content);
    let facts;
    try {
      const parsed = JSON.parse(content);
      facts = parsed.facts || [];
      if (!Array.isArray(facts) || facts.length < 3) {
        throw new Error("Response does not contain a valid facts array with at least 4 items");
      }
    } catch (parseError) {
      console.error("JSON parsing error:", parseError, "Raw content:", content);
      return NextResponse.json({ error: "Invalid JSON response from OpenAI", rawContent: content }, { status: 500 });
    }

    return NextResponse.json({ facts });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Failed to fetch fun facts' },
      { status: 500 }
    );
  }
}

export const GET = () =>
  NextResponse.json({ error: 'Method not allowed' }, { status: 405 });