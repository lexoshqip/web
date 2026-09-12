#!/usr/bin/env node
/**
 * seed-placeholders.mjs
 * Creates clearly-marked PLACEHOLDER master files for every corpus book
 * that is missing one. Texts are generic samples written for development
 * only — they must be replaced with the authors' original texts during
 * manual curation.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG = path.join(ROOT, "corpus", "catalog.json");
const CORPUS = path.join(ROOT, "corpus");

const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));

const NOTICE = `> **TEKST SHËMBULL (PLACEHOLDER).** Ky përmbajtje është krijuar vetëm për të demonstruar platformën gjatë fazës së zhvillimit. Në procesin e kurimit manual do të zëvendësohet me tekstin origjinal të autorit, i përgatitur nga ekipi juridik e redaktorial.`;

function prose(title, author) {
  return `${NOTICE}

# ${title}

Kjo faqe ruan vendin e një teksti që do të vijë. Ndër rrathët e këtij kapitulli gjen vetëm shembuj të kompozicionit: fjali që matën gjerësinë e kolonës, thonj që testojnë «ç» dhe «ë», dhe pikëpamje që tregojnë ku ndalet rreshti.

Librat e vjetër kanë erën e tyre. Kush hap një libër të lashtë, hap një dritare drejt dhomës ku dikush u ul me bojën e zezë dhe me durim të madh shkroi fjalë pas fjale, pa ditur kush do t'i lexonte pas njëqind vjetësh.

## Kapitulli i parë

Autori i këtyre radhëve, ${author}, do të flasë këtu me zërin e vet origjinal sapo teksti të verifikohet dhe të skanohet. Deri atëherë këto paragrafë mbajnë hapësirën e tij të ngrohtë, ashtu si një shtëpi e ndriçuar pret pronarin që vonohet.

Lexuesi nuk ka nxitim. Ai e di se çdo bibliotekë fillon me një raft bosh dhe se çdo raft mbushet fjalë pas fjale, vit pas viti. Portalët e mëdhenj të letërsisë nuk u ndërtuan në një dimër.

## Kapitulli i dytë

Këtu do të vijë vazhdimi i tekstit. Faqja e dytë ka të njëjtat virtyte si e para: qartësi, frymëmarrje të mirë të rreshtave dhe një margjinal të majtë ku lexuesi i vjetër mund të lërë lapsin e vet.

- Rreshti i parenditshkruar për testim
- Tjetri, pak më i gjatë, për të provuar mbështjelljen e tekstit në ekran të ngushtë
- Dhe një i treti që mbyll listën me hijeshi

## Kapitulli i tretë

Në fund të shembullit mbeten tri fjalë të mira: lexo ngadalë, kthehu shpesh, trashëgo librin. Kështu u transmetua letra jonë nga shekulli në shekull dhe kështu duhet ta dorëzojmë ne brezit tjetër — e plotë, e pastër dhe e lirë.`;
}

function poetry(title, author) {
  return `${NOTICE}

# ${title}

*vargje shembullore për testimin e kompozicionit*

Vendi ku ndalen vargjet
nuk është fundi i tyre;
aty fillon heshtja
që i këndon me zë të plotë.

## Kënga e dytë

Mbi mal ra dritë e hollë,
e holla si fijet e arit,
dhe çdo gjethe e mblodhi
si një dorë e kujdesshme.

${author} do t'i shkruajë këto strofa
me fjalët e veta, të pavera;
deri atëherë vargjet e shembullit
mbajnë ritmin e tyre të lehtë.

## Kënga e tretë

S'ka gjë më të bukur në botë
sa një libër që pret lexuesin,
dhe s'ka gjë më të bukur te lexuesi
se dora që kthen faqen me dashamirësi.

Mos u nxitua, mik i dashur:
letra nuk vdes kurrë,
ajo thjesht pushon pak,
si një lahutë midis dy këngëve.`;
}

function pick(book, authorName) {
  return book.tags.includes("Poezi") || book.tags.includes("Epopee")
    ? poetry(book.title, authorName)
    : prose(book.title, authorName);
}

let created = 0;
for (const book of catalog.books) {
  if (!book.master) continue;
  const author = catalog.authors.find((a) => a.id === book.authorId);
  const dir = path.join(CORPUS, path.dirname(book.master));
  fs.mkdirSync(dir, { recursive: true });
  const masterPath = path.join(CORPUS, book.master);
  if (!fs.existsSync(masterPath)) {
    fs.writeFileSync(masterPath, pick(book, author.name) + "\n", "utf8");
    created++;
  }
  if (book.accessType === "trial" && book.masterTrial) {
    const trialPath = path.join(CORPUS, book.masterTrial);
    if (!fs.existsSync(trialPath)) {
      const head = pick(book, author.name).split("\n## ").slice(0, 2).join("\n## ");
      fs.writeFileSync(trialPath, head + "\n\n*…fragmenti përfundon këtu. Vepra e plotë do të publikohet pas kurimit.*\n", "utf8");
      created++;
    }
  }
}
console.log(`seed-placeholders: ${created} placeholder file(s) created, ${catalog.books.length - created} already present.`);
