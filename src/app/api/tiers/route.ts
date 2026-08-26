import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  name: z.string().min(2).max(40),
  priceCents: z.coerce.number().int().min(299).max(50000),
  interval: z.enum(["WEEKLY", "MONTHLY", "SEASON"]),
  description: z.string().min(5).max(300),
  perks: z.array(z.string().min(1).max(100)).min(1).max(6),
  accentColor: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "HANDICAPPER") {
    return NextResponse.json({ error: "Handicapper account required" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  const profile = await prisma.handicapperProfile.findUnique({ where: { userId: session.user.id } });
  if (!profile) return NextResponse.json({ error: "No handicapper profile" }, { status: 404 });

  const existingCount = await prisma.membershipTier.count({ where: { handicapperId: profile.id } });
  if (existingCount >= 6) {
    return NextResponse.json({ error: "Maximum of 6 tiers per handicapper" }, { status: 400 });
  }

  const slugBase = `${session.user.username}-${data.name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const slug = `${slugBase}-${Date.now().toString(36)}`;

  const tier = await prisma.membershipTier.create({
    data: {
      handicapperId: profile.id,
      name: data.name,
      slug,
      priceCents: data.priceCents,
      interval: data.interval,
      description: data.description,
      perks: data.perks.join("|"),
      accentColor: data.accentColor ?? "#c9a24b",
    },
  });

  return NextResponse.json({ ok: true, tier });
}
