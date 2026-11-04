# Room to Shop

Snap a photo of your room, clear it out, try new pieces (AI-designed or real products), and shop everything you see.

- **Studio** (`/studio/[id]`) — paint a mask over part of your photo, then:
  - **Clear out** — a magic eraser: describe what's going (and what belongs behind it) in one box, and the AI removes it and rebuilds hidden cabinets, floors and walls
  - **Add with AI** — describe a piece + pick a style; it's placed with real perspective & shadows
  - **Add your own item** — upload a photo or paste a product/image link, box the item, and drop it in (great for artwork)
  - **Move anything** — with the Move tool, tap any piece you added (AI or product) to lift it out of the photo and drag it; what was behind it is restored
  - **Products** — search real stores, cut the product out, drag/resize/rotate it into your room, then **Blend with AI** for matching light and shadows (or place as-is for free). Recently viewed and saved items (with folders) live here too
  - **Shop** — box anything to find it with Google Lens; every AI or placed piece is listed with prices and a running total
  - History strip that never loses a version (editing an older one branches), undo/redo, before/after compare, download
- **Shop a photo** (`/shop`) — the original Lens flow: upload any photo, box an item, get matches.
- Results everywhere have sort (price, rating, reviews), filters (price range, rating, retailer, in stock), pagination, and "search more stores". Lens results keep Facebook Marketplace listings, labeled as such.
- Projects are saved in the browser (IndexedDB). No accounts.

## How walls stay untouched

Image models redraw the whole picture even when given a mask, so walls and windows drift. We never use the model's output outside your mask: the browser composites only the masked pixels (with a feathered edge and automatic color matching) back onto your original photo. Everything you didn't paint is your original pixels. The prompts (`lib/prompts.ts`) then make the generated area agree with the untouched room. For small painted areas, a zoomed-in crop (still at least half the photo) is sent so the model spends its resolution on the piece.

## Deploying on Vercel

1. In your Vercel project → **Settings → Build & Deployment**, set **Framework Preset** to **Next.js** (the old version used "Other").
2. **Settings → Environment Variables** — add:

   | Variable | Required | What it's for |
   | --- | --- | --- |
   | `SERP_KEY` | yes | Google Lens + Google Shopping via [SerpAPI](https://serpapi.com) |
   | `IMGBB_KEY` | yes | Temporary hosting of your crop so Lens can see it (auto-deletes after 10 min) |
   | `OPENAI_API_KEY` | yes | AI edits. Your OpenAI org may need [verification](https://platform.openai.com/settings/organization/general) to use image models |
   | `UNSPLASH_ACCESS_KEY` | yes | Inspo photos. Free: [unsplash.com/developers](https://unsplash.com/developers) → New Application → Access Key |
   | `OPENAI_IMAGE_MODEL` | no | Starting model: `gpt-image-1-mini` (default, cheapest), `gpt-image-1.5`, or `gpt-image-2`. Visitors can switch in the studio |
   | `OPENAI_ALLOWED_MODELS` | no | Comma-separated list to restrict which models visitors may pick (e.g. hide Premium) |
   | `CONTACT_EMAIL` | no | Shown on the privacy page |
   | `APP_ACCESS_CODE` | no | Visitors must enter this code before searching or generating — protects your API bill while you're in beta |
   | `AMAZON_ASSOCIATE_TAG` | no | e.g. `yourtag-20`; added to Amazon links |
   | `SOVRN_API_KEY` | no | Sovrn Commerce key; turns links to thousands of retailers into affiliate links |
   | `SKIMLINKS_ID` | no | Skimlinks publisher ID; used if Sovrn isn't set |

3. Redeploy. The app shows a yellow banner listing any missing keys.

AI edits take 20–60s, so the edit function is allowed 300s. That needs Vercel's Fluid Compute, which is on by default for new projects.

### Accounts, cloud saves and daily limits (Supabase)

Optional, but needed for Sign in with Google, syncing rooms and saves across devices, daily AI limits, and admin-only Best quality. Without it the app works as before, with everything stored in the browser, no limits, and Best hidden for everyone.

1. **Create a project** at [supabase.com](https://supabase.com) → New project (pick a region near you; save the database password somewhere safe).
2. **Create the tables:** Supabase → **SQL Editor** → New query → paste all of [`supabase/schema.sql`](supabase/schema.sql) → **Run**. It's safe to run again after updates.
3. **Make a Google sign-in client:** [Google Cloud Console](https://console.cloud.google.com) → create a project → **APIs & Services → OAuth consent screen**: External, app name, your support email, then publish it. Then **Credentials → Create credentials → OAuth client ID → Web application**, and under *Authorized redirect URIs* add `https://<your-project-ref>.supabase.co/auth/v1/callback` (Supabase shows this exact URL on its Google provider page). Copy the Client ID and Client secret.
4. **Turn on Google in Supabase:** Authentication → **Sign In / Providers → Google** → enable, paste the Client ID and secret, save.
5. **Tell Supabase your site's address:** Authentication → **URL Configuration** → *Site URL* = your app's URL (e.g. `https://your-app.vercel.app`), and under *Redirect URLs* add `https://your-app.vercel.app/**` (plus `https://*-yourteam.vercel.app/**` if you test on preview deployments).
6. **Copy the keys:** Project Settings → **API keys** → the Project URL, the *publishable* (or legacy *anon*) key, and the *secret* (or legacy *service_role*) key.
7. **Add them in Vercel** → Settings → Environment Variables, then redeploy:

   | Variable | What it's for |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The publishable/anon key (safe to be public) |
   | `SUPABASE_SERVICE_ROLE_KEY` | The secret/service_role key — server only, never share it |
   | `ADMIN_EMAILS` | Your Google email(s), comma-separated: Best quality and no daily limit |
   | `FREE_EDITS_PER_DAY` / `ACCOUNT_EDITS_PER_DAY` / `NETWORK_EDITS_PER_DAY` | Optional; defaults 3 / 15 / 10 |

Limits reset at midnight UTC. Signed-out visitors are counted per device, with a per-network backstop so clearing the browser doesn't reset it; failed generations aren't counted. Signing out saves everything to the account and clears that device.

### Costs to expect
Each AI edit is one OpenAI image call. The studio shows an estimate on every generate button. Roughly, per edit of a landscape photo: Budget + Draft ≈ 1¢, Balanced + Standard ≈ 5¢, Premium + Best ≈ 33¢. Each Lens or store search is one SerpAPI search. Set `APP_ACCESS_CODE` before sharing the link widely.

## Affiliate links

All outbound product links go through `lib/server/affiliate.ts`: Amazon links get your Associates tag, everything else goes through Sovrn (or Skimlinks). With nothing configured, links go straight to the retailer. Apply to programs once the site is live, then add the env vars — no code changes needed. The site footer includes an FTC-style affiliate disclosure.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in keys, or set MOCK_APIS=1 to run with fake data
npm run dev
```

`MOCK_APIS=1` returns fake products and a visible striped "mock edit" so you can click through every flow without API keys.
