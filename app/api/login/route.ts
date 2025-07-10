import { NextResponse } from "next/server";
import { authenticateUser } from "@/app/lib/mongodb";

export async function POST(request: Request) {
  const { username, password } = await request.json();

  const result = await authenticateUser(username, password);

  if (result.success && result.knowledgeId) {
    return NextResponse.json({ knowledgeId: result.knowledgeId }, { status: 200 });
  } else {
    return NextResponse.json({ error: result.error || "Invalid credentials" }, { status: 401 });
  }
}