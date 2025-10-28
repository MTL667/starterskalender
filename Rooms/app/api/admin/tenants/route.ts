import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const tenants = await prisma.allowedTenant.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ tenants });
  } catch (error) {
    console.error("Error fetching tenants:", error);
    return NextResponse.json({ error: "Failed to fetch tenants" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const tenant = await prisma.allowedTenant.create({
      data,
    });
    return NextResponse.json({ tenant });
  } catch (error) {
    console.error("Error creating tenant:", error);
    return NextResponse.json({ error: "Failed to create tenant" }, { status: 500 });
  }
}
