// Server-only collocations loader (read data/collocations/collocations.json).
// Must never be imported from a client component (uses node:fs + the SQLite
// layer for status gating, ADR-0004). Parallel to lib/loaders.ts.

import { promises as fs } from "fs";
import path from "path";
import { loadTest, loadTests } from "./loaders";
import { getStatuses } from "./db";
import type { Letter, ReadingTest, TestStatus } from "./types";

export type CollocationPart = 5 | 6 | 7;

export interface SourceRef {
  testId: string;
  part: CollocationPart;
  questionNumber: number;
}

export interface Collocation {
  id: string;
  expression: string;
  chinese: string;
  type: string;
  bookFreq: number;
  counts: { 5: number; 6: number; 7: number };
  bookletCount: number;
  priority: "S" | "A" | "B" | null;
  sourceType: string;
  sources: SourceRef[];
}

interface CollocationsFile {
  source: string;
  count: number;
  items: Collocation[];
}

const FILE = path.join(process.cwd(), "data", "collocations", "collocations.json");

let cache: Collocation[] | null = null;

export async function loadCollocations(): Promise<Collocation[]> {
  if (cache) return cache;
  const raw = await fs.readFile(FILE, "utf-8");
  cache = (JSON.parse(raw) as CollocationsFile).items;
  return cache;
}

export async function getCollocation(id: string): Promise<Collocation | null> {
  const all = await loadCollocations();
  return all.find((c) => c.id === id) ?? null;
}

/** Which Parts this collocation appears in (by Vocabulary Check count). */
export function partsOf(c: Collocation): CollocationPart[] {
  return ([5, 6, 7] as CollocationPart[]).filter((p) => c.counts[p] > 0);
}

// ---- learning card: lightweight source index (labels only, no question text) ---- //
// The learning card never loads question content — only test title + status +
// question numbers. Question numbers are safe to show (they don't reveal stems),
// and the full questions live on the separate /questions view (Q11 split).

export interface CollocationSourceIndexEntry {
  testId: string;
  title: string;
  status: TestStatus;
  revealed: boolean;
  numbers: number[];
}

export async function collocationSourceIndex(
  c: Collocation,
): Promise<CollocationSourceIndexEntry[]> {
  const statuses = getStatuses();
  const tests = await loadTests();
  const titleById = new Map(tests.map((t) => [t.testId, t.title]));

  const byTest = new Map<string, number[]>();
  for (const s of c.sources) {
    if (!byTest.has(s.testId)) byTest.set(s.testId, []);
    byTest.get(s.testId)!.push(s.questionNumber);
  }

  const entries: CollocationSourceIndexEntry[] = [...byTest.entries()].map(
    ([testId, numbers]) => {
      const status = statuses[testId] ?? "not_started";
      return {
        testId,
        title: titleById.get(testId) ?? testId,
        status,
        revealed: status !== "not_started",
        numbers: numbers.sort((a, b) => a - b),
      };
    },
  );
  entries.sort((a, b) => (a.testId < b.testId ? -1 : a.testId > b.testId ? 1 : 0));
  return entries;
}

// ---- detail (questions view): resolve sources to real questions, gated by status ---- //

export interface CollocationQuestion {
  part: CollocationPart;
  number: number;
  stem: string;
  options: Record<Letter, string>;
  answer: Letter;
  translation: string;
  explanation: string;
  passage: { title: string; descriptor: string; text: string } | null;
}

export interface CollocationSourceGroup {
  testId: string;
  title: string;
  status: TestStatus;
  /** status !== "not_started" — question content may be shown. */
  revealed: boolean;
  /** All referenced question numbers (always safe to show; counts only). */
  numbers: number[];
  /** Populated only when revealed; empty for not_started tests. */
  questions: CollocationQuestion[];
}

function indexTest(test: ReadingTest): Map<number, CollocationQuestion> {
  const m = new Map<number, CollocationQuestion>();
  for (const part of test.parts) {
    if (part.part === 5) {
      for (const q of part.questions) {
        m.set(q.number, {
          part: 5,
          number: q.number,
          stem: q.stem,
          options: q.options,
          answer: q.answer,
          translation: q.translation,
          explanation: q.explanation,
          passage: null,
        });
      }
    } else {
      for (const ps of part.passages) {
        for (const q of ps.questions) {
          m.set(q.number, {
            part: part.part,
            number: q.number,
            stem: q.stem,
            options: q.options,
            answer: q.answer,
            translation: q.translation,
            explanation: q.explanation,
            passage: { title: ps.title, descriptor: ps.descriptor, text: ps.text },
          });
        }
      }
    }
  }
  return m;
}

/**
 * Resolve a collocation's source refs into per-test groups. Questions are loaded
 * ONLY for tests whose status is not "not_started", so unseen-question samples
 * can never leak through this view (project invariant: 未见题样本).
 */
export async function collocationSourceGroups(
  c: Collocation,
): Promise<CollocationSourceGroup[]> {
  const statuses = getStatuses();
  const byTest = new Map<string, number[]>();
  for (const s of c.sources) {
    if (!byTest.has(s.testId)) byTest.set(s.testId, []);
    byTest.get(s.testId)!.push(s.questionNumber);
  }

  const groups: CollocationSourceGroup[] = [];
  for (const [testId, numbers] of byTest) {
    const status = statuses[testId] ?? "not_started";
    const revealed = status !== "not_started";
    const group: CollocationSourceGroup = {
      testId,
      title: testId,
      status,
      revealed,
      numbers,
      questions: [],
    };
    if (revealed) {
      const test = await loadTest(testId);
      if (test) {
        group.title = test.title;
        const index = indexTest(test);
        group.questions = numbers
          .map((n) => index.get(n))
          .filter((x): x is CollocationQuestion => !!x)
          .sort((a, b) => a.number - b.number);
      }
    }
    groups.push(group);
  }

  groups.sort((a, b) => (a.testId < b.testId ? -1 : a.testId > b.testId ? 1 : 0));
  return groups;
}
