export const metadata = { title: "Terms of Service — OwnerFlow Sports" };

const SECTIONS = [
  {
    title: "1. What OwnerFlow Sports is",
    body: "OwnerFlow Sports is a marketplace for sports research, picks, parlays, and live analysis published by independent handicappers. We are not a sportsbook and do not accept or place wagers on behalf of any user.",
  },
  {
    title: "2. No guarantees",
    body: "Picks and analysis published on this platform reflect the opinions of individual handicappers. Past performance does not guarantee future results, and no content on OwnerFlow Sports should be considered financial advice.",
  },
  {
    title: "3. Memberships & purchases",
    body: "Individual picks, parlays, and membership tiers are sold as one-time or recurring digital access. Access is granted immediately upon purchase; refund eligibility is limited given the immediate delivery of digital content.",
  },
  {
    title: "4. Handicapper accounts",
    body: "Users publishing picks under a Handicapper account are independent contractors, not employees of OwnerFlow Sports. OwnerFlow Sports retains a platform fee on sales and subscriptions generated through the platform.",
  },
  {
    title: "5. Eligibility",
    body: "You must be at least 21 years old and located in a jurisdiction where sports research and information services of this kind are lawful to use OwnerFlow Sports.",
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Legal</p>
      <h1 className="font-display text-4xl">Terms of Service</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        This is a demo document for the OwnerFlow Sports platform preview.
      </p>
      <div className="mt-10 flex flex-col gap-8">
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <h2 className="font-display text-lg">{s.title}</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
