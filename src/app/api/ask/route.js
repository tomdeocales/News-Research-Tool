import { NextResponse } from "next/server";
import { askQuestion } from "@/controllers/newsController";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const result = await askQuestion(body);
    return NextResponse.json(result.data, { status: result.status });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


