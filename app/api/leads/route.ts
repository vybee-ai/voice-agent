import { NextRequest, NextResponse } from "next/server";
import { leadsService } from "@/services/leadsService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const buyerName = String(body.buyerName || body.name || "").trim();
    const phone = String(body.phone || body.mobile || body.customerNumber || "").trim();
    const leadId = body.leadId ? String(body.leadId).trim() : undefined;
    const source = body.source ? String(body.source).trim() : "Web Voice Call (Sofia)";

    if (!buyerName) {
      return NextResponse.json(
        { error: "Buyer name is required." },
        { status: 400 }
      );
    }

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required." },
        { status: 400 }
      );
    }

    const lead = await leadsService.create({
      leadId,
      buyerName,
      phone,
      source,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Lead recorded successfully.",
        lead,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("API /api/leads POST error:", error);
    return NextResponse.json(
      { error: "Failed to record lead. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const leads = await leadsService.getAll();
    return NextResponse.json({ leads, count: leads.length });
  } catch (error) {
    console.error("API /api/leads GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leads." },
      { status: 500 }
    );
  }
}
