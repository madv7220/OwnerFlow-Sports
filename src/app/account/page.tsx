import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "@/components/account/profile-form";

export const metadata = { title: "Account Settings — OwnerFlow Sports" };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/account");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl mb-8">Account settings</h1>

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm name={user.name} bio={user.bio ?? ""} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <Row label="Email" value={user.email} />
            <Row label="Username" value={`@${user.username}`} />
            <Row label="Role" value={user.role} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Manage your balance and view transaction history.
            </p>
            <Button asChild variant="outline">
              <Link href="/account/wallet">Go to wallet</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
