import { redirect } from "next/navigation";

// Heroes list page redirects to the rankings page
export default function HeroesPage() {
  redirect("/rankings");
}
