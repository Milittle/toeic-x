// Server-only collocations loader (read data/collocations/collocations.json).
// Must never be imported from a client component (uses node:fs + the SQLite
// layer for status gating, ADR-0004). Parallel to content/question-bank.ts.

import { promises as fs } from "fs";
import path from "path";
import { loadTest, loadTests } from "./question-bank";
import { getStatuses } from "../adapters/sqlite/db";
import type { Letter, ReadingTest, TestStatus } from "../domain/types";

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
  /**
   * 自撰例句（教材/题库里查不到用例的搭配才有）：不是题库内容，可以无条件显示。
   * 见 .scratch/collocation-examples/spec.md。
   */
  example?: string;
  exampleZh?: string;
  /** 例句备注，用来标明它是模型产物、待人工复核。 */
  exampleNote?: string;
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

// ---- list filtering/ordering: shared by the list page and the detail page's
// prev/next navigation so both always walk the same ordered subset ---- //

export interface CollocationListFilters {
  part?: string;
  priority?: string;
  type?: string;
  q?: string;
  sort?: string;
}

/**
 * Apply the same filters and ordering as the collocations list page. Keeping
 * this in one place guarantees the detail page's 上一个/下一个 follow the exact
 * list the user came from (filters + sort), not some unrelated global order.
 */
export function filterAndSortCollocations(
  all: Collocation[],
  f: CollocationListFilters,
): Collocation[] {
  const fPart = f.part;
  const fPriority = f.priority;
  const fType = f.type;
  const fQ = (f.q ?? "").trim().toLowerCase();
  const sort = f.sort === "alpha" ? "alpha" : "freq";

  const items = all.filter((c) => {
    if (fPart && c.counts[Number(fPart) as 5 | 6 | 7] <= 0) return false;
    if (fPriority && c.priority !== fPriority) return false;
    if (fType && c.type !== fType) return false;
    if (fQ) {
      const hay = `${c.expression} ${c.chinese}`.toLowerCase();
      if (!hay.includes(fQ)) return false;
    }
    return true;
  });

  return items.sort((a, b) =>
    sort === "alpha"
      ? a.expression.localeCompare(b.expression)
      : b.bookFreq - a.bookFreq || b.bookletCount - a.bookletCount,
  );
}

/**
 * Serialize the list filters into a query string (no leading "?"). Only
 * carries params that affect the ordered subset; page/size stay on the list.
 */
export function collocationListQuery(f: CollocationListFilters): string {
  const p = new URLSearchParams();
  if (f.part) p.set("part", f.part);
  if (f.priority) p.set("priority", f.priority);
  if (f.type) p.set("type", f.type);
  if (f.q) p.set("q", f.q);
  if (f.sort === "alpha") p.set("sort", "alpha");
  return p.toString();
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
  /**
   * Part 6 专有：该题在所属文章里的第几个空（0 起）。文章正文的空位没有题号时，
   * 「原句」靠它定位（见 lib/domain/collocation-example.ts）。
   */
  blankIndex?: number;
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
        ps.questions.forEach((q, i) => {
          m.set(q.number, {
            part: part.part,
            number: q.number,
            stem: q.stem,
            options: q.options,
            answer: q.answer,
            translation: q.translation,
            explanation: q.explanation,
            passage: { title: ps.title, descriptor: ps.descriptor, text: ps.text },
            blankIndex: part.part === 6 ? i : undefined,
          });
        });
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
