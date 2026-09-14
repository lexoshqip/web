# LexoShqip — Web

Aplikacioni web i platformës LexoShqip: portal për leximin e letërsisë shqipe. Ndërtuar me React + Vite, vendoset në Cloudflare Pages.

## Stack

- **React 19** + TypeScript + Tailwind CSS
- **Lexues:** PDF.js, epub.js
- **Kërkim:** FlexSearch
- **Hosting:** Cloudflare Pages + Backblaze B2 (S3-compatible)

## Zhvillim lokal

```bash
npm install
cp .dev.vars.example .dev.vars   # shto B2 credentials
npm run dev                       # ndërton content pastaj nis serverin
npm run build                     # build prodhimi
npm run typecheck
```

`npm run dev` lexon metadata nga B2 buckets (përmes `catalog.json`) dhe shërben përmbajtjen direkt nga B2 nëpërmjet një S3 proxy plugin.

## Libraritë

Çdo librari është një repo e veçantë me B2 bucket:

| Repo | Bucket | Përshkrim |
|---|---|---|
| [lexoshqip/arka](https://github.com/lexoshqip/arka) | `lexoshqip-arka` | Domain publik — autorë të vdekur 70+ vjet |
| [lexoshqip/agim](https://github.com/lexoshqip/agim) | `lexoshqip-agim` | Autorë bashkëkohorë me lejen e autorit |
| [lexoshqip/lira](https://github.com/lexoshqip/lira) | `lexoshqip-lira` | Përmbajtje e lirë online |

## Konfigurimi i librarive

`libraries.config.json` përcakton se cilat libraari lexohen dhe si:

```json
{
  "libraries": [
    {
      "id": "arka",
      "label": "Arka",
      "path": "../arka",
      "enabled": true,
      "s3": {
        "bucket": "lexoshqip-arka",
        "endpoint": "s3.us-east-005.backblazeb2.com",
        "region": "us-east-005",
        "proxy": true
      }
    }
  ]
}
```

- **`s3.proxy: true`** — përmbajtja shërbehet përmes Cloudflare Worker (S3 proxy)
- **`s3.proxy: false`** ose pa `s3` — përmbajtja shërbehet drejtpërdrejt

## Catalog.json

Çdo librari ka një `catalog.json` që përmban të gjithë metadata-n (epochs, collections, authors, books) në një skedar të vetëm. Kjo redukton downloads nga 300+ në 3 gjatë build-it.

```bash
npm run generate:catalog          # gjeneron catalog.json për të gjitha libraritë
node scripts/generate-catalog.mjs ../arka  # vetëm për një librar
```

## S3 Proxy (Cloudflare Worker)

Për libraritë private (`proxy: true`), përmbajtja shërbehet përmes një Cloudflare Worker:

- **Dev:** Vite plugin në `vite.config.ts` signon requests përmes S3 API
- **Prod:** Cloudflare Worker në `worker/index.ts`

```bash
npm run worker:dev                # zhvillim lokal i Worker
npm run worker:deploy             # deploy në Cloudflare
```

Secrets:
```bash
wrangler secret put S3_ACCESS_KEY_ID
wrangler secret put S3_SECRET_ACCESS_KEY
```

## Deployment (Cloudflare)

```bash
npm run build
wrangler pages deploy dist
```

## Pipeline e content-it

`scripts/build-content.mjs` lexon libraritë dhe gjeneron API statike JSON në `public/api/`:

1. Shkarkon `catalog.json` nga çdo B2 bucket (1 request per library)
2. Gjeneron endpoints: epochs, authors, books, search index
3. Rewrites `/content/` URLs → `/api/s3-proxy/{bucket}/content/...`
4. Përmbajtja aktuale (EPUB, PDF, audio) shërbehet direkt nga B2 në runtime

## Variable mjedisi

| Variable | Përshkrim | Ku përdoret |
|---|---|---|
| `S3_ACCESS_KEY_ID` | B2 Application Key ID | build + dev |
| `S3_SECRET_ACCESS_KEY` | B2 Application Key | build + dev |

Vendosni në `.dev.vars` për zhvillim lokal (gitignored).
