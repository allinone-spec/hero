import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url || !url.startsWith("https://en.wikipedia.org/")) {
    return new NextResponse("Invalid URL", { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; HeroApp/1.0)" },
    });
    if (!res.ok) {
      return new NextResponse("Failed to fetch", { status: res.status });
    }

    let html = await res.text();

    // Rewrite relative URLs to absolute so assets load correctly
    html = html.replace(/(href|src|srcset)="\/\//g, '$1="https://');
    html = html.replace(/(href|src|srcset)="\//g, '$1="https://en.wikipedia.org/');

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return new NextResponse("Fetch error", { status: 500 });
  }
}
