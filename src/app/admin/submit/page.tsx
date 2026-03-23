import type { Metadata } from "next";
import SubmitHeroClient from "./SubmitHeroClient";

export const metadata: Metadata = {
  title: "Submit a Hero",
  description:
    "Submit a military hero to be scored and ranked on the USM-25 leaderboard. Just paste their Wikipedia page link.",
};

export default function SubmitPage() {
  return <SubmitHeroClient />;
}
