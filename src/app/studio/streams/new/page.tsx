import { requireHandicapperProfile } from "@/lib/studio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewStreamForm } from "@/components/studio/new-stream-form";

export const metadata = { title: "Schedule Stream — OwnerFlow Sports" };

export default async function NewStreamPage() {
  await requireHandicapperProfile();

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Schedule a live stream</CardTitle>
        </CardHeader>
        <CardContent>
          <NewStreamForm />
        </CardContent>
      </Card>
    </div>
  );
}
