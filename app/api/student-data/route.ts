import { NextResponse } from "next/server";
import { fetchStudentData } from "@/app/lib/mongodb";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json({ error: "Username is required" }, { status: 400 });
  }

  const studentData = await fetchStudentData(username);

  if (studentData) {
    return NextResponse.json(studentData, { status: 200 });
  } else {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }
}