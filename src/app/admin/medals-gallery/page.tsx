import dbConnect from "@/lib/mongodb";
import MedalType from "@/lib/models/MedalType";
import MedalListClient from "./MedalListClient";

export const dynamic = "force-dynamic";

export default async function AdminMedalsGalleryPage() {
  await dbConnect();
  const medalTypes = await MedalType.find({}).sort({ precedenceOrder: 1 }).lean();
  const serialized = JSON.parse(JSON.stringify(medalTypes));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Medal Catalog</h1>
        <p className="text-[var(--color-text-muted)]">
          All medal types recognized by the USM-25 scoring system — click any medal to view details
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
