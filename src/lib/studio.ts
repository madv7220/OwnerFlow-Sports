import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireHandicapperProfile() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/studio");
  if (session.user.role !== "HANDICAPPER") redirect("/dashboard");

  const profile = await prisma.handicapperProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) redirect("/dashboard");

  return { session, profile };
}
