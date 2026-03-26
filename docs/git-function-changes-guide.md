# Git history: exported symbols in changed modules

This guide lists **exported functions, consts, types, and interfaces** in files that differ between the **first application baseline** and **current `HEAD`**. It is meant as a map of “what lives where” after the evolution from the early tree—not a line-by-line changelog.

## How to read the git range

| Commit | Role |
|--------|------|
| `2481fb7` | Root “Initial commit” — only `README.md`; no application source. |
| `803f38e` | First commit that introduces the app under `src/` (“initial commit” in history). |

**Comparison used for this document:** `803f38e..HEAD` (baseline with real code → current).

**Recorded `HEAD` when generated:** `4728d75` (run `git rev-parse HEAD` to refresh).

To list every changed path yourself:

```bash
git diff --name-only 803f38e..HEAD -- src/
```

To regenerate the **named export** inventory for any subtree:

```bash
node scripts/list-exports-since-baseline.mjs 803f38e src/lib/
node scripts/list-exports-since-baseline.mjs 803f38e src/components/
```

The script only picks up **line-leading** `export function`, `export async function`, `export const`, `export type`, `export interface`, `export enum`, and `export class`. It does **not** list `export default`, `export { … }` re-exports, or handlers inside `route.ts` files.

## Special cases (touched by diff, not in the scanner list)

| File | Notes |
|------|--------|
| `src/lib/award-clerk.ts` | Re-exports `normalizeAwardText` from `@/lib/medal-normalization` (`export { … } from`). |
| `src/lib/sync-medal-types.ts` | CLI-style script; no exports; entry is internal `run()`. |

## `src/lib` — exports in files changed since `803f38e`

### `src/lib/adoption.ts`

- `nowUtc()` — function  
- `isAdoptionActive()` — function  
- `nextAdoptionExpiry()` — function  

### `src/lib/auth.ts`

- `ensureSeedAdmin()` — async function  
- `type VerifyCredentialsResult`  
- `verifyCredentials()` — async function  
- `getGroupSlugForUser()` — async function  
- `createToken()` — function  
- `verifyToken()` — function  
- `getSession()` — async function  
- `requireAdmin()` — async function  
- `requirePrivilege()` — async function  
- `getEffectivePermissionLevel()` — function  

### `src/lib/caretaker-queue.ts`

- `uniqueHeroSlug()` — async function  
- `createHeroFromImportResult()` — async function  

### `src/lib/client-session-hint.ts`

- `type SiteSessionHint`  
- `type AdminSessionHint`  
- `writeSiteMemberHint()` — function  
- `readSiteMemberHint()` — function  
- `clearSiteMemberHint()` — function  
- `writeAdminHint()` — function  
- `readAdminHint()` — function  
- `clearAdminHint()` — function  
- `clearAllSessionHints()` — function  

### `src/lib/country-display.ts`

- `countryOptionLabel()` — function  

### `src/lib/derive-hero-metadata-tags.ts`

- `deriveHeroMetadataTags()` — function  

### `src/lib/explore-curated-lists.ts`

- `type CuratedExplorePreset`  
- `curatedPresetHref()` — function  

### `src/lib/hero-access.ts`

- `type HeroOwnerCheck`  
- `assertHeroOwnerAccess()` — function  

### `src/lib/hero-import-pipeline.ts`

- `interface HeroImportResult`  
- `extractHeroNameFromUrl()` — function  
- `runHeroImportPipeline()` — async function  

### `src/lib/marketplace-admin-stats.ts`

- `type MarketplaceRecentPaidRow`  
- `type MarketplaceAdminStats`  
- `getMarketplaceAdminStats()` — async function  

### `src/lib/match-ai-medals.ts`

- `interface MedalTypeForMatch`  
- `interface MatchedAiMedal`  
- `interface UnmatchedMedalName`  
- `matchAiMedalsToDatabase()` — function  

### `src/lib/medal-device-rules.ts`

- `type MedalDeviceFamily`  
- `type MedalRepeatDeviceKind`  
- `interface MedalDeviceRule`  
- `interface MedalDeviceRuleContext`  
- `parseMedalDeviceRule()` — function  
- `resolveMedalDeviceRule()` — function  
- `describeMedalDevices()` — function  
- `getMedalDeviceFamilyLabel()` — function  

### `src/lib/medal-inventory-importer.ts`

- `type ImportMedalRow`  
- `parseMedalInventoryCsv()` — function  
- `type ImportResult`  
- `importMedalInventoryFromDir()` — async function  

### `src/lib/medal-normalization.ts`

- `interface NormalizedAwardText`  
- `normalizeAwardText()` — function  

### `src/lib/medal-primary-image-url.ts`

- `getFirstWikiImageUrl()` — function  
- `getMedalPrimaryImageUrl()` — function  

### `src/lib/medal-short-name.ts`

- `deriveShortNameFromMedalName()` — function  
- `medalShortLabelForDisplay()` — function  

### `src/lib/medal-wiki-scraper.ts`

- `interface ScrapedMedalImage`  
- `interface ScrapedMedalData`  
- `scrapeMedalWikipedia()` — async function  

### `src/lib/metadata-tags.ts`

- `HERO_METADATA_TAGS` — const  
- `type HeroMetadataTagId`  
- `normalizeMetadataTags()` — function  

### `src/lib/models/AdoptionTransaction.ts`

- `interface IAdoptionTransaction`  

### `src/lib/models/CaretakerQueueItem.ts`

- `interface ICaretakerQueueItem`  

### `src/lib/models/Hero.ts`

- `type CombatSpecialty`  
- `interface IHeroDoc`  

### `src/lib/models/HeroImportBatch.ts`

- `interface IHeroImportBatch`  

### `src/lib/models/MedalType.ts`

- `interface IWikiImage`  
- `interface IMedalTypeDoc`  

### `src/lib/models/PagePermission.ts`

- `interface IPagePermission`  
- `DEFAULT_PAGES` — const  

### `src/lib/models/ProcessedStripeInvoice.ts`

- `interface IProcessedStripeInvoice`  

### `src/lib/models/User.ts`

- `interface IUser`  

### `src/lib/models/War.ts`

- `interface IWarDoc`  

### `src/lib/openai.ts`

- `DEFAULT_GEMINI_MODEL_ID` — const  
- `interface AIResponse`  
- `geminiRejectsThinkingBudgetZero()` — function  
- `askAI()` — async function  
- `generateHeroDescription()` — async function  
- `getMedalList()` — async function  
- `getWarList()` — async function  
- `analyzeHero()` — async function  
- `fetchHeroFromAI()` — async function  
- `matchRibbonsToMedals()` — async function  
- `interface MedalCellInput`  
- `matchMedalsRibbonsAndDevices()` — async function  

### `src/lib/public-heroes.ts`

- `interface PublicHeroListItem`  
- `getPublishedHeroesForPublicList()` — async function  

### `src/lib/public-site-url.ts`

- `getPublicSiteUrl()` — function  

### `src/lib/rack-engine.ts`

- `interface RackDeviceImage`  
- `interface RackMedalTypeLike`  
- `interface RackMedalEntryLike`  
- `interface RackRenderMedal`  
- `interface RibbonRackProfile`  
- `isUnitCitationMedal()` — function  
- `getRibbonRackProfile()` — function  
- `sortRackMedals()` — function  
- `buildRibbonRackMedals()` — function  

### `src/lib/resend-from.ts`

- `getResendFrom()` — function  

### `src/lib/safe-image-url.ts`

- `safeHttpImageUrl()` — function  

### `src/lib/scoring-engine.ts`

- `interface ScoringConfig`  
- `calculateScore()` — function  
- `calculateComparisonScore()` — function  
- `interface HeroForRanking`  
- `rankHeroes()` — function  

### `src/lib/session-cookies.ts`

- `clearAuthTokenCookie()` — function  
- `clearAllSessionCookies()` — function  

### `src/lib/site-auth.ts`

- `interface SiteSession`  
- `createSiteUserToken()` — function  
- `verifySiteUserToken()` — function  
- `getSiteSession()` — async function  
- `setSiteUserCookie()` — function  
- `clearSiteUserCookie()` — function  
- `OWNER_HERO_PATCH_KEYS` — const  

### `src/lib/site-verification-email.ts`

- `generateEmailVerifyToken()` — function  
- `sendSiteMemberVerificationEmail()` — async function  

### `src/lib/stripe-adoption.ts`

- `type AdoptionCheckoutContext`  
- `applyAdoptionAfterCheckoutPayment()` — async function  
- `extendAdoptionFromSubscriptionInvoice()` — async function  

### `src/lib/stripe-subscription-sync.ts`

- `pickPrimarySubscription()` — function  
- `syncUserStripeFieldsFromSubscriptions()` — async function  

### `src/lib/wikimedia-url.ts`

- `normalizeWikimediaImageUrl()` — function  

### `src/lib/wikipedia-article-images.ts`

- `getWikipediaMedalOrRibbonImageUrl()` — async function  

### `src/lib/wikipedia-medal-title.ts`

- `WIKIPEDIA_EN_API_HEADERS` — const  
- `sanitizeMedalNameForWiki()` — function  
- `resolveMedalWikipediaTitle()` — async function  
- `resolveMedalWikipediaTitleWithFallback()` — async function  

### `src/lib/wikipedia-scraper.ts`

- `interface ScrapedMedal`  
- `type CombatType`  
- `interface MedalCell`  
- `interface RibbonRackCell`  
- `interface ScrapedHero`  
- `scrapeWikipediaHero()` — async function  

## `src/components` — named exports in changed files

These files were modified in `803f38e..HEAD` and expose at least one **named** export matching the scanner rules:

### `src/components/admin/SiteMembersAdminPanel.tsx`

- `interface SiteMemberRow`  

### `src/components/medals/MedalDisplayThumb.tsx`

- `interface MedalThumbSources`  
- `MedalDisplayThumb()` — function  
- `MedalDisplayThumbRow()` — function  

### `src/components/medals/MedalWikiModal.tsx`

- `interface MedalModalData`  

### `src/components/ribbon-rack/RibbonRack.tsx`

- `interface DeviceImage`  
- `interface RibbonMedal`  

### `src/components/ribbon-rack/ribbon-devices.ts`

- `type DeviceKind`  
- `interface Device`  
- `interface PositionedDevice`  
- `computeDevices()` — function  
- `layoutDevices()` — function  
- `starPoints()` — function  

### `src/components/ui/AdminLoader.tsx`

- `ADMIN_PAGE_LOADER_ORBIT_PX` — const  
- `ADMIN_COMPACT_LOADER_ORBIT_PX` — const  
- `type AdminLoaderOrbitVariant`  
- `AdminLoaderOrbit()` — function  
- `AdminLoader()` — function  

### `src/components/ui/ConfirmDialog.tsx`

- `type ConfirmOptions`  
- `useConfirm()` — function  
- `type AlertOptions`  
- `useAlert()` — function  
- `type ConfirmDialogProps`  

### `src/components/ui/SafeWikimediaImg.tsx`

- `SafeWikimediaImg()` — function  

### Other changed components (mostly default exports)

The following were also modified in `803f38e..HEAD` but typically use **`export default`** for the main component, so they do not appear in the line-based scan:

- `src/components/auth/TermsOfEngagementModal.tsx`  
- `src/components/explore/ExploreNavigator.tsx`  
- `src/components/heroes/HeroCard.tsx`  
- `src/components/ribbon-rack/WikiRibbonRackDisplay.tsx`  
- `src/components/scoring/ScoreBreakdown.tsx`  
- `src/components/ui/ContactModal.tsx`  
- `src/components/ui/HeroSlideshow.tsx`  
- `src/components/ui/ImageUpload.tsx`  
- `src/components/ui/LoadingSpinner.tsx`  
- `src/components/ui/MedalAvatarDesigner.tsx`  
- `src/components/ui/Navbar.tsx`  
- `src/components/ui/NavigationProgress.tsx`  

## App Router API routes

Many files under `src/app/api/**/route.ts` changed. Next.js expects exported **`GET`**, **`POST`**, **`PATCH`**, **`PUT`**, **`DELETE`**, etc., on those modules. For a full list of route files:

```bash
git diff --name-only 803f38e..HEAD -- "src/app/api/**/route.ts"
```

## Pages and clients

`src/app/**` contains a large number of **`page.tsx`**, **`layout.tsx`**, and `*Client.tsx` modules. Most export a **default** page or layout component. Use `git diff --name-only 803f38e..HEAD -- src/app/` for the complete set of touched files.

---

*Generated from repository state; re-run the commands above after new commits to refresh.*
