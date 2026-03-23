"use client";

import { useSearchParams } from "next/navigation";
import HeroForm from "../HeroForm";

export default function NewHeroPage() {
  const searchParams = useSearchParams();
  const wikiUrl = searchParams.get("wikiUrl") || undefined;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Create New Hero</h1>
      <HeroForm importWikiUrl={wikiUrl} />
    </div>
  );
}
