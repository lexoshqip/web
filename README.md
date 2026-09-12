# LexoShqip — Web

Aplikacioni web i platformës LexoShqip: portal për leximin e letërsisë shqipe. Ndërtuar me React + Vite, vendoset në Cloudflare Pages.

## Stack

- **React 19** + TypeScript + Tailwind CSS
- **Lexues:** PDF.js, epub.js
- **Kërkim:** FlexSearch
- **Hosting:** Cloudflare Pages + R2

## Zhvillim lokal

```bash
npm install
npm run dev        # ndërton content pastaj nis serverin
npm run build      # build prodhimi
npm run typecheck
```

## Pipeline e content-it

Skripti `scripts/build-content.mjs` lexon libraritë dhe gjeneron API statike JSON në `public/api/` dhe media në `public/content/`. Libraritë mund të jenë lokale ose të hostuara:

```bash
npm run build:content                              # autodiscovers *Library/ folders
LEXOSHQIP_LIBRARY=Library:FreeOnlineLibrary npm run build:content
```

## Deployment (Cloudflare)

Çdo librari ka **R2 bucket** të vetin. Gjatë build-it, skripti shkarkon manifestin nga R2 dhe bën bake të metadata-s në SPA. PDF-të shërbehen drejtpërdrejt nga R2 gjatë runtime.

```bash
npm run build
wrangler pages deploy dist
```

Libraritë remote konfigurohen në `libraries.config.json`:

```json
{
  "libraries": [
    { "id": "library", "label": "LexoShqip Library", "url": "https://pub-xxx.r2.dev", "enabled": true },
    { "id": "free",    "label": "Free Online Library", "url": "https://pub-yyy.r2.dev", "enabled": true }
  ]
}
```

## Libraritë

| Repo | Përshkrim |
|---|---|
| [lexoshqip-library](https://github.com/lexoshqip/library) | Domain publik |
| [lexoshqip-free-library](https://github.com/lexoshqip/free-library) | Të lira online |
