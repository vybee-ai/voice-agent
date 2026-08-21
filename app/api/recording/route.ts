import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get("url");
  const callIdParam = req.nextUrl.searchParams.get("callId");

  if (!urlParam && !callIdParam) {
    return new NextResponse("Missing url or callId parameter", { status: 400 });
  }

  try {
    let targetUrl: string | null = urlParam ? decodeURIComponent(urlParam) : null;

    // Helper to check if string is a Vapi call UUID
    const isVapiCallId = (id: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const callId = callIdParam || (targetUrl && isVapiCallId(targetUrl) ? targetUrl : null);

    // If a Vapi call ID is specified, query Vapi REST API to resolve the recording URL
    if (callId && (!targetUrl || isVapiCallId(targetUrl))) {
      const apiKey = process.env.VAPI_API_KEY;
      if (!apiKey) {
        return new NextResponse("VAPI_API_KEY is not configured on server", { status: 404 });
      }

      const vapiRes = await fetch(`https://api.vapi.ai/call/${callId}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        cache: "no-store",
      });

      if (!vapiRes.ok) {
        return new NextResponse(`Vapi API returned ${vapiRes.status}`, { status: vapiRes.status });
      }

      const callData = await vapiRes.json();
      targetUrl =
        callData.recordingUrl ||
        callData.stereoRecordingUrl ||
        callData.artifact?.recordingUrl ||
        callData.artifact?.stereoRecordingUrl;

      if (!targetUrl) {
        return new NextResponse("No recording URL found for this Vapi call", { status: 404 });
      }
    }

    if (!targetUrl) {
      return new NextResponse("Invalid recording target URL", { status: 400 });
    }

    const headers: Record<string, string> = {
      "User-Agent": "OneX-CRM/1.0",
    };

    if (process.env.VAPI_API_KEY && targetUrl.includes("vapi.ai")) {
      headers["Authorization"] = `Bearer ${process.env.VAPI_API_KEY}`;
    }

    const res = await fetch(targetUrl, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      return new NextResponse(`Upstream returned ${res.status}`, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "audio/wav";
    const arrayBuffer = await res.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(arrayBuffer.byteLength),
        "Cache-Control": "public, max-age=86400",
        "Accept-Ranges": "bytes",
      },
    });
  } catch (err: any) {
    return new NextResponse(err?.message || "Failed to fetch recording", { status: 500 });
  }
}

