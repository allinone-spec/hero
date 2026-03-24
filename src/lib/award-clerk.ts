/**
 * Stage 1 — AI as data entry clerk: normalize messy award language into canonical
 * medal names + counts + valor flags before matching to MedalType / Hero.medals.
 *
 * Import/scraper code should run strings through `normalizeAwardText` (or match-ai-medals,
 * which already does) so "three Silver Stars" and "Silver Star with two OLC" converge.
 */
export { normalizeAwardText } from "@/lib/medal-normalization";
