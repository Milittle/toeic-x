// Server-only question bank loaders (read data/questions/*.json from disk).
// Must never be imported from a client component (uses node:fs, ADR-0002).

import { promises as fs } from "fs";
import path from "path";
import type { ReadingTest } from "../domain/types";

const QUESTIONS_DIR = path.join(process.cwd(), "data", "questions");

let cache: ReadingTest[] | null = null;

export async function loadTests(): Promise<ReadingTest[]> {
  if (cache) return cache;
  const files = (await fs.readdir(QUESTIONS_DIR)).filter(
    (f) => f.startsWith("reading-") && f.endsWith(".json"),
  );
  const tests = await Promise.all(
    files.sort().map(async (f) => {
      const raw = await fs.readFile(path.join(QUESTIONS_DIR, f), "utf-8");
      return JSON.parse(raw) as ReadingTest;
    }),
  );
  cache = tests;
  return tests;
}

export async function loadTest(testId: string): Promise<ReadingTest | null> {
  const tests = await loadTests();
  return tests.find((t) => t.testId === testId) ?? null;
}
