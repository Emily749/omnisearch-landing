import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRetailer } from "@/lib/retailers";

const AFFILIATE_TEMPLATES: Record<string, string | undefined> = {
  tesco: process.env.AFFILIATE_TEMPLATE_TESCO,
  sainsburys: process.env.AFFILIATE_TEMPLATE_SAINSBURYS,
  waitrose: process.env.AFFILIATE_TEMPLATE_WAITROSE,
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ retailer: string }> }
) {
  const { retailer: retailerId } = await params;
  const retailer = getRetailer(retailerId);
  const destination = AFFILIATE_TEMPLATES[retailerId];

  if (!retailer || !destination) {
    return NextResponse.redirect(new URL("/shop", request.url));
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase
      .from("clickthroughs")
      .insert({ retailer: retailerId, user_id: user?.id ?? null });
  } catch {
    // Click logging is best-effort and should never block the redirect.
  }

  return NextResponse.redirect(destination, { status: 302 });
}
