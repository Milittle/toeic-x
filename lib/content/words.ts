// Server-only vocabulary loader (read data/words/words.json).
// Must never be imported from a client component (uses node:fs, ADR-0005).
// Parallel to content/question-bank.ts and content/collocations.ts.

import { promises as fs } from "fs";
import path from "path";

export type WordList = "key1500" | "tsl1250" | "ngsl2809";
export type WordLevel = "S" | "A" | "B" | "基础";

export interface Word {
  id: string;
  list: WordList;
  word: string;
  phonetic: string | null;
  pos: string | null;
  zhDef: string;
  enDef: string;
  source: string | null;
  ngslRank: number | null;
  tslRank: number | null;
  totalFreq: number;
  partCounts: { 5: number; 6: number; 7: number };
  p5AnswerCount: number;
  collocation: string | null;
  collocationCount: number;
  collocationId: string | null;
  wordClassTag: string | null;
  core1500: boolean;
  compositeScore: number;
  level: WordLevel | null;
  sourceUrls: { list: string | null; def: string | null };
}

export interface WordListMeta {
  label: string;
  count: number;
}

interface WordsFile {
  source: string;
  count: number;
  lists: Record<WordList, WordListMeta>;
  items: Word[];
}

const FILE = path.join(process.cwd(), "data", "words", "words.json");

let cache: WordsFile | null = null;

async function loadFile(): Promise<WordsFile> {
  if (cache) return cache;
  const raw = await fs.readFile(FILE, "utf-8");
  cache = JSON.parse(raw) as WordsFile;
  return cache;
}

export async function loadWords(): Promise<Word[]> {
  return (await loadFile()).items;
}

export async function loadWordLists(): Promise<Record<WordList, WordListMeta>> {
  return (await loadFile()).lists;
}
