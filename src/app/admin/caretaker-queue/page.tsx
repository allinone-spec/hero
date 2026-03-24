import { redirect } from "next/navigation";

export default async function CaretakerQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ batchId?: string }>;
}) {
  const params = await searchParams;
  const batchId = params.batchId ? `&batchId=${encodeURIComponent(params.batchId)}` : "";
  redirect(`/admin/suggestions?tab=caretaker${batchId}`);
}
