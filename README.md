# Marriage expenses

Local vendor ledger for wedding costs. Quoted, extras, and payments live in this browser (IndexedDB). No server.

## On your phone (fastest)

Same Wi‑Fi as your laptop:

```bash
npm install
npm run dev:mobile
```

Open the `Network` URL Vite prints (e.g. `http://192.168.x.x:5174`) on your phone.

## Live hosted app

CI deploys to **Cloudflare Pages** on every push to `main`.

1. Create a [Cloudflare API token](https://dash.cloudflare.com/profile/api-tokens) with **Cloudflare Pages — Edit**
2. In this repo: **Settings → Secrets and variables → Actions**, add:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID` (from Cloudflare dashboard URL)
3. Re-run the **Deploy** workflow (or push again)

Your app will be at `https://expenses.pages.dev` (or similar).

> GitHub Pages is not available on free private org repos. To use it instead, make the repo public and switch the workflow back.

## Local dev

```bash
npm install
npm run dev
```
