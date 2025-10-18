// NER/OCR + ingestion domain contracts for Memories AI Ingestor

export type UUID = string;

export type EntityType = 'PERSON_NAME' | 'DATE' | 'PLACE' | 'OTHER';

export interface BBox {
  // normalized 0..1 coordinates on the page image
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Span {
  start: number; // char offset in the page text
  end: number;   // char offset (exclusive)
}

export interface OcrBlock {
  page: number; // 1-based page index
  text: string; // full page text (post-processed)
}

export interface OcrResult {
  docId: UUID;
  pages: OcrBlock[];
  lang?: string; // e.g., 'pt', 'es-Latn'
}

export interface EntityBase {
  id: UUID;
  type: EntityType;
  text: string;
  confidence: number; // 0..1
  page: number; // page where found
  span?: Span; // where in page text
  bbox?: BBox; // optional bounding box
}

export interface PersonEntity extends EntityBase {
  type: 'PERSON_NAME';
  normalized?: string; // normalized personal name
}

export interface DateEntity extends EntityBase {
  type: 'DATE';
  // parsed date range when applicable
  iso?: { from?: string; to?: string };
}

export interface PlaceEntity extends EntityBase {
  type: 'PLACE';
  normalized?: string; // canonical place text
  placeId?: string; // resolved FS placeId
}

export type NerEntity = PersonEntity | DateEntity | PlaceEntity | EntityBase;

export interface NerResult {
  docId: UUID;
  entities: NerEntity[];
}

export interface SuggestedPerson {
  // Tree person suggestion derived from extracted entities
  name: string;
  score: number; // 0..1
  explanations: string[]; // why this suggestion
  fsUrl?: string; // deep-link to FS profile
  fsPersonId?: string;
}

export interface CitationDraft {
  title: string;
  note?: string;
  url?: string; // public or app-hosted URL to the image/PDF
}

export interface IngestResult {
  docId: UUID;
  ocr: OcrResult;
  ner: NerResult;
  suggestions: SuggestedPerson[];
  citation: CitationDraft;
}

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface IngestJob {
  id: UUID;
  uploadId: UUID;
  status: JobStatus;
  error?: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

