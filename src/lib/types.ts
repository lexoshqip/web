export type FormatKind = "epub" | "pdf" | "md" | "audio";
export type AccessType = "full" | "trial";

/** machine-readable license ids (mirrors LICENSES in scripts/build-content.mjs) */
export type LicenseId =
  | "public-domain"
  | "cc0"
  | "cc-by"
  | "cc-by-sa"
  | "cc-by-nd"
  | "cc-by-nc"
  | "cc-by-nc-sa"
  | "cc-by-nc-nd"
  | "permission"
  | "freely-available"
  | "unknown";

export interface LibraryContact {
  email?: string;
  takedownEmail?: string;
}

export interface LibraryLink {
  label: string;
  url: string;
}

export interface Library {
  id: string;
  name: string;
  description: string;
  accent: string;
  brandColor?: string;
  logoUrl?: string;
  bannerUrl?: string;
  maintainer?: string;
  website?: string;
  policy?: string;
  contact?: LibraryContact;
  links?: LibraryLink[];
  bookCount: number;
  authorCount: number;
}

/** how firmly the rights claim is established, from strongest to weakest */
export type VerificationId = "juridical" | "source-declared" | "pending";

export interface BookSource {
  name: string;
  url: string;
  note?: string;
}

export interface BookRights {
  license: LicenseId;
  licenseLabel: string;
  /** official Creative Commons deed (when applicable) */
  licenseDeed?: string;
  verification: VerificationId;
  verificationLabel: string;
  notes?: string;
  sources?: BookSource[];
}

/** lightweight rights info carried on index items (badges) */
export interface BookRightsStub {
  license: LicenseId;
  verification: VerificationId;
}

export interface Epoch {
  id: string;
  title: string;
  years: string;
  description: string;
  coverImage: string;
}

export type AuthorKind = "albanian" | "foreign";

/** external link an author wants to promote (website, socials, shop…) */
export interface AuthorLink {
  label: string;
  url: string;
  /** optional hint for the icon; hostname is used as fallback */
  kind?: "website" | "social" | "shop" | "support" | "other";
}

export interface AuthorIndexItem {
  id: string;
  name: string;
  dates: string;
  epochId?: string | null;
  /** extra epochs the author belongs to (primary lives in epochId) */
  epochIds?: string[];
  kind?: AuthorKind;
  isFeatured: boolean;
  portrait: string;
  bookCount: number;
  libraryId?: string | null;
  links?: AuthorLink[];
  /** pseudonyms / alternate spellings — searchable, shown on the author page */
  altNames?: string[];
  bornPlace?: string;
  diedPlace?: string;
}

export interface Author extends AuthorIndexItem {
  born: number | null;
  died: number | null;
  bio: string;
  wikipedia: string;
  /** credit line shown under the portrait (photo rights) */
  portraitCredit?: string;
  bookIds: string[];
}

export interface Collection {
  id: string;
  title: string;
  description: string;
  coverImage: string;
}

export interface BookIndexItem {
  id: string;
  title: string;
  authorId: string;
  authorName: string;
  epochId?: string | null;
  tags: string[];
  publicationYear: number;
  isFeatured: boolean;
  accessType: AccessType;
  coverThumb: string;
  /** metadata-only = bibliographic record; master text not digitized yet */
  availability?: "full-text" | "metadata-only";
  channel?: "main" | "emerging";
  collectionIds?: string[];
  hasAudio?: boolean;
  rights?: BookRightsStub;
  libraryId?: string | null;
  /** bibliographic extras — all optional, see Library/README.md */
  subtitle?: string;
  altTitles?: string[];
  language?: string;
  ageGroup?: string;
  readingMinutes?: number;
}

export interface Book extends BookIndexItem {
  synopsis: string;
  rightsStatus: "verified" | "pending";
  /** tiered rights + provenance (sources, notes) — see Library/README.md */
  rights?: BookRights;
  /** Optional credit for translated works (e.g., scripture editions). */
  translator?: string;
  originalTitle?: string;
  originalLanguage?: string;
  isbn?: string;
  coverCredit?: string;
  narrator?: string;
  wordCount?: number;
  cover: string;
  formats: Partial<Record<FormatKind, string>> & {
    /** JSON chapter list for audiobooks */
    audioChapters?: string;
    /** zip archive of all audio files */
    audioZip?: string;
  };
  relatedIds: string[];
  /** alternate versions of individual formats (optional; default file lives in formats) */
  editions?: BookEdition[];
}

export interface Manifest {
  version: number;
  builtAt: string;
  counts: { epochs: number; authors: number; books: number };
}

/** a non-default version of one format, e.g. an alternate historical print */
export interface BookEdition {
  id: string;
  format: FormatKind;
  label: string;
  url: string;
  /** audio editions ship their own chapter list + zip */
  audioChapters?: string;
  audioZip?: string;
}

export interface FeaturedPayload {
  heroBookIds: string[];
  /** "Kryevepra të zgjedhura" carousel — optional for older payloads */
  selectedBookIds?: string[];
  featuredAuthorIds: string[];
  epochIds: string[];
}

export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export type BookSort = "title" | "year" | "year-desc";

export interface BookFilter {
  epoch?: string;
  collectionId?: string;
  channel?: "main" | "emerging" | "all";
  hasAudio?: boolean;
  availFilter?: "digitized" | "missing";
  authorId?: string;
  tag?: string;
  libraryId?: string;
  q?: string;
  sort?: BookSort;
  page?: number;
  pageSize?: number;
}

export interface SearchResults {
  books: BookIndexItem[];
  authors: AuthorIndexItem[];
  epochs: Epoch[];
}

export interface ReadingProgress {
  position: string | null;
  /** whole-book progress 0..1 */
  percent: number;
  /** optional secondary progress 0..1 (e.g. chapter position in epub) */
  chapterPercent?: number;
  updatedAt: number;
  label?: string;
}
