# Marriage expenses

Local vendor ledger for wedding costs. Quoted, extras, and payments live in this browser (IndexedDB). No server.

**Live app:** https://pirates-of-the-lost-tokens.github.io/expenses/

## Setup (one time)

1. Make this repo **public** (Settings → General → Change visibility)
2. Enable **GitHub Pages**: Settings → Pages → Source: **GitHub Actions**
3. Push to `main` — the Deploy workflow publishes automatically

## On your phone (local, same Wi‑Fi)

```bash
npm install
npm run dev:mobile
```

Open the `Network` URL Vite prints (e.g. `http://192.168.x.x:5174`).

## Local dev

```bash
npm install
npm run dev
```
