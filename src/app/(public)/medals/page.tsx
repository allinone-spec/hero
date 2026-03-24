import dbConnect from "@/lib/mongodb";
import MedalType from "@/lib/models/MedalType";
import type { Metadata } from "next";
import MedalListClient from "./MedalListClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Medal Catalog",
  description:
    "Catalog of U.S. and Commonwealth military medals and decorations with precedence data, ribbon visuals, and scoring references.",
  openGraph: {
    title: "Medal Catalog — Medals N Bongs",
    description: "Browse U.S. and Commonwealth medal inventories used by the archive and rack engine.",
  },
  keywords: ["military medals", "Commonwealth medals", "Medal of Honor", "Victoria Cross", "ribbon rack", "medal catalog"],
};

export default async function MedalsPage() {
  await dbConnect();
  const medalTypes = await MedalType.find({}).sort({ precedenceOrder: 1 }).lean();
  const serialized = JSON.parse(JSON.stringify(medalTypes));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Medal Catalog</h1>
        <p className="text-[var(--color-text-muted)]">
          U.S. and Commonwealth medal inventories used by the archive and rack engine
        </p>
      </div>

      {serialized.length === 0 ? (
        <p className="text-center text-[var(--color-text-muted)] py-12">
          No medal types found. Seed the database to populate medal types.
        </p>
      ) : (
        <MedalListClient medals={serialized} />
      )}
    </div>
  );
}
