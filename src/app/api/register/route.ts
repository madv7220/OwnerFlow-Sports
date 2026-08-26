import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  name: z.string().min(2).max(60),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, and underscores only"),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  role: z.enum(["BETTOR", "HANDICAPPER"]).default("BETTOR"),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { name, username, email, password, role } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: normalizedEmail }, { username }] },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Email or username already in use" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      username,
      email: normalizedEmail,
      passwordHash,
      role,
      walletBalance: 50000, // $500.00 demo credit so purchases work immediately
      ...(role === "HANDICAPPER"
        ? {
            handicapper: {
              create: {
                displayName: name,
                tagline: "New handicapper on OwnerFlow Sports",
                specialties: "NFL",
              },
            },
          }
        : {}),
    },
  });

  await prisma.walletTransaction.create({
    data: {
      userId: user.id,
      type: "DEPOSIT",
      amountCents: 50000,
      description: "Welcome credit",
    },
  });

  return NextResponse.json({ ok: true });
}
