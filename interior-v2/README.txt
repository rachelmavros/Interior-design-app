DEPLOY INSTRUCTIONS

1. Upload ALL FILES in this zip to the ROOT of your GitHub repo.
2. In Vercel:
   - Import the repo
   - Framework preset: Other
3. Add Environment Variables:
   - SERP_KEY
   - IMGBB_KEY
4. Redeploy

After deploy test:
https://YOURDOMAIN.vercel.app/api/lens-search

You should see:
{"error":"Method not allowed"}
