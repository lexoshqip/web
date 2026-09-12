# Legacy scripts

One-off tools targeting the **pre-migration `corpus/` layout** (monolithic
`corpus/catalog.json` + flat folders). Kept for reference/history only.

- `import/` — Wikipedia/Wikidata/Gutenberg harvesters & merge tools that built the old corpus.
- `seed-placeholders.mjs` — seeded demo content into the old corpus.
- `migrate-to-library.mjs` — one-time migration: `corpus/` → `../Library` (already executed).

The live content pipeline is `Website/scripts/build-content.mjs`, which reads
the new `Library/` hierarchy. See `Library/README.md` for the data format.
