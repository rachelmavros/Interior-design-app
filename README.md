# Room to Shop

Snap a photo of your room, clear it out, try new pieces (AI-designed or real products), and shop everything you see.

- **Studio** (`/studio/[id]`) — paint a mask over part of your photo, then:
  - **Clear out** furniture (AI fills in the floor/walls behind it)
  - **Add with AI** — describe a piece + pick a style; it's placed with real perspective & shadows
  - **Custom** — any masked edit ("paint this wall sage green")
  - **Products** — search real stores, cut the product out, drag/resize/rotate it into your room, then **Blend with AI** for matching light and shadows (or place as-is for free)
  - **Shop** — box anything to find it with Google Lens; every AI or placed piece is listed with prices and a running total
  - History strip, undo/redo, before/after compare, download
- **Shop a photo** (`/shop`) — the original Lens flow: upload any photo, box an item, get matches.
- Results everywhere have sort (price, rating, reviews), filters (price range, rating, retailer, in stock), pagination, and "search more stores".
- Projects are saved in the browser (IndexedDB). No accounts.

## How walls stay untouched

Image models redraw the whole picture even when given a mask, so walls and windows drift. We never use the model's output outside your mask: the browser composites only the masked pixels (with a feathered edge and automatic color matching) back onto your original photo. Everything you didn't paint is your original pixels. The prompts (`lib/prompts.ts`) then make the generated area agree with the untouched room.

## Deploying on Vercel

1. In your Vercel project → **Settings → Build & Deployment**, set **Framework Preset** to **Next.js** (the old version used "Other").
2. **Settings → Environment Variables** — add:

   | Variable | Required | What it's for |
   | --- | --- | --- |
   | `SERP_KEY` | yes | Google Lens + Google Shopping via [SerpAPI](https://serpapi.com) |
   | `IMGBB_KEY` | yes | Temporary hosting of your crop so Lens can see it (auto-deletes after 10 min) |
   | `OPENAI_API_KEY` | yes | AI edits. Your OpenAI org may need [verification](https://platform.openai.com/settings/organization/general) to use image models |
   | `OPENAI_IMAGE_MODEL` | no | Defaults to `gpt-image-2`. `gpt-image-1.5` / `gpt-image-1` also work |
   | `APP_ACCESS_CODE` | no | Visitors must enter this code before searching or generating — protects your API bill while you're in beta |
   | `AMAZON_ASSOCIATE_TAG` | no | e.g. `yourtag-20`; added to Amazon links |
   | `SOVRN_API_KEY` | no | Sovrn Commerce key; turns links to thousands of retailers into affiliate links |
   | `SKIMLINKS_ID` | no | Skimlinks publisher ID; used if Sovrn isn't set |

3. Redeploy. The app shows a yellow banner listing any missing keys.

AI edits take 20–60s, so the edit function is allowed 300s. That needs Vercel's Fluid Compute, which is on by default for new projects.

### Costs to expect
Each AI edit is one OpenAI image call. **Draft** (low) quality costs cents; **Best** (high) is roughly 10–15× more. Each Lens or store search is one SerpAPI search. Set `APP_ACCESS_CODE` before sharing the link widely.

## Affiliate links

All outbound product links go through `lib/server/affiliate.ts`: Amazon links get your Associates tag, everything else goes through Sovrn (or Skimlinks). With nothing configured, links go straight to the retailer. Apply to programs once the site is live, then add the env vars — no code changes needed. The site footer includes an FTC-style affiliate disclosure.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in keys, or set MOCK_APIS=1 to run with fake data
npm run dev
```

`MOCK_APIS=1` returns fake products and a visible striped "mock edit" so you can click through every flow without API keys.
