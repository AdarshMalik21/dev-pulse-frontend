import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) {
    return NextResponse.json({ error: "BACKEND_URL is not set" }, { status: 500 });
  }

  try {
    const res = await fetch(`${backendUrl}/metrics/timeseries`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Backend unreachable" }, { status: 502 });
  }
}