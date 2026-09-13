// 把「这个搭配在真题里长什么样」算成可以直接渲染的三段式（前文 / 搭配本身 / 后文）。
//
// 纯函数、无 I/O：是不是允许展示由调用方决定 —— 搭配真题页只在套题已揭示时渲染
// （见 app/collocations/[id]/questions/page.tsx 的门控），所以这里不做任何状态判断。
//
// 三种来源：
//   1. Part 5 题干：把横线换成正确答案；
//   2. Part 6 文章：先按题号标记 (131) 找到对应的空，再换答案；找不到标记就退化到
//      「该题在文章里的第几个空」；
//   3. Part 6/7 文章：在文中定位搭配本身，取它所在的那一句。
//
// 题库文本的句读并不完整（PDF 提取会成段丢句点，个别 P6 文章正文直接缺失），所以
// 句子过长或定位不到句末标点时，退化成前后各若干词的小窗口，而不是把整篇文章抛出来。

export interface CollocationExample {
  /** 搭配之前的文字（已 trim）。 */
  before: string;
  /** 搭配在原句里的样子：填空题是填入的正确答案，阅读题是文中匹配到的原文。 */
  match: string;
  /** 搭配之后的文字（已 trim）。 */
  after: string;
}

export interface FillBlankOptions {
  /** 题号标记，如 131 对应文章里的 `(131)`；用于在 Part 6 文章里定位空位。 */
  marker?: number;
  /** 找不到标记时的兜底：该题对应文章里的第几个空（0 起）。 */
  blankIndex?: number;
}

export interface ExampleSource {
  part: number;
  /** 题号，用于在 Part 6 文章里找 `(131)` 标记。 */
  number: number;
  stem: string;
  /** 正确答案的文本，如 "negotiations"。 */
  answerText: string;
  passageText?: string | null;
  /** Part 6：该题在所属文章里的序号（0 起）。 */
  blankIndex?: number;
  expression: string;
}

/** 空位：`--------`、`---- ---`（PDF 把一行横线断成两段）、长下划线。 */
const BLANK_RE = /[-_]{2,}(?:\s*[-_]{2,})*/g;

/** 句末标点（含右引号/右括号），其后是空白或文末才算一句结束。 */
const SENTENCE_END_RE = /[.!?]+["')\u201d\u2019]?(?=\s|$)/g;

/** 空位前面紧跟的题号标记，如 `(131)`；它不属于原句，渲染时去掉。 */
const MARKER_BEFORE_BLANK_RE = /\(\s*\d{1,3}\s*\)\s*$/;

/** 句子超过这么多词就只截搭配周围的窗口 —— 题库里有整段丢句点形成的超长「句」。 */
const MAX_SENTENCE_WORDS = 40;

/** 退化窗口：搭配前后各保留多少个词。 */
const WINDOW_WORDS = 12;

// 搭配里的占位符，编译正则前剥掉（与 scripts/collocation_sources.py 同一套写法）。
const PLACEHOLDER_RES: RegExp[] = [
  /\bsb\.?/gi,
  /\bsth\.?/gi,
  /\bp\.p\./gi,
  /~/g,
  /\bdoing\b/gi,
  /\.\.\.|…/g,
  /\bone'?s?\b/gi,
  /'s\b/gi,
  /\b[A-Z]\b/g,
];

// 首词的常见变形（与 scripts/collocation_sources.py 的 VERB_INFLECTIONS 对齐）。
const INFLECTIONS: Record<string, string[]> = {
  be: ["be", "is", "are", "was", "were", "been", "being", "am"],
  have: ["have", "has", "had", "having"],
  do: ["do", "does", "did", "doing", "done"],
  go: ["go", "goes", "went", "gone", "going"],
  get: ["get", "gets", "got", "gotten", "getting"],
  let: ["let", "lets", "letting"],
  pay: ["pay", "pays", "paid", "paying"],
  put: ["put", "puts", "putting"],
  run: ["run", "runs", "ran", "running"],
  see: ["see", "sees", "saw", "seen", "seeing"],
  set: ["set", "sets", "setting"],
  make: ["make", "makes", "made", "making"],
  take: ["take", "takes", "took", "taken", "taking"],
  give: ["give", "gives", "gave", "given", "giving"],
  come: ["come", "comes", "came", "coming"],
  bring: ["bring", "brings", "brought", "bringing"],
  result: ["result", "results", "resulted", "resulting"],
  look: ["look", "looks", "looked", "looking"],
  turn: ["turn", "turns", "turned", "turning"],
  offer: ["offer", "offers", "offered", "offering"],
  charge: ["charge", "charges", "charged", "charging"],
  notify: ["notify", "notifies", "notified", "notifying"],
  inform: ["inform", "informs", "informed", "informing"],
  rely: ["rely", "relies", "relied", "relying"],
  apply: ["apply", "applies", "applied", "applying"],
  agree: ["agree", "agrees", "agreed", "agreeing"],
};

function escapeRe(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tokenize(expression: string): string[] {
  let raw = expression;
  for (const re of PLACEHOLDER_RES) raw = raw.replace(re, " ");
  return raw.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

function variantsOf(token: string): string[] {
  const known = INFLECTIONS[token];
  if (known) return known;
  if (token.length < 4 || !/^[a-z]+$/.test(token)) return [token];
  if (token.endsWith("e")) return [...new Set([token, `${token}d`, `${token.slice(0, -1)}ing`, `${token}s`])];
  if (token.endsWith("y") && !/[aeiou]/.test(token[token.length - 2])) {
    return [...new Set([token, `${token.slice(0, -1)}ies`, `${token.slice(0, -1)}ied`, `${token}ing`])];
  }
  return [...new Set([token, `${token}s`, `${token}ed`, `${token}ing`])];
}

/**
 * 把搭配编译成一个宽松的正则：首词认常见变形，词与词之间最多允许两个词。
 * 单锚点（`to`、`offer` 这种占位符剥完只剩一个词）返回 null —— 那种匹配到处都是。
 */
export function expressionPattern(expression: string): RegExp | null {
  const tokens = tokenize(expression);
  if (tokens.length < 2) return null;
  const head = variantsOf(tokens[0]).map(escapeRe).join("|");
  const tail = tokens
    .slice(1)
    .map((t) => `(?:\\s+\\S+){0,2}\\s+${escapeRe(t)}\\b`)
    .join("");
  return new RegExp(`\\b(?:${head})\\b${tail}`, "i");
}

interface Slice {
  start: number;
  end: number;
  /** 截断过（窗口兜底或超长句），渲染时补省略号。 */
  truncated: boolean;
}

function sentenceEnds(text: string): number[] {
  return [...text.matchAll(SENTENCE_END_RE)].map((m) => m.index + m[0].length);
}

function cutStart(text: string, position: number, words: number): number {
  const before = [...text.slice(0, position).matchAll(/\S+/g)];
  return before.length <= words ? 0 : before[before.length - words].index;
}

function cutEnd(text: string, position: number, words: number): number {
  const after = [...text.slice(position).matchAll(/\S+/g)];
  if (after.length <= words) return text.length;
  const last = after[words - 1];
  return position + last.index + last[0].length;
}

/** 搭配所在句；句子过长或没有句末标点时退化成前后各 12 个词的窗口。 */
function contextSlice(text: string, start: number, end: number): Slice {
  const ends = sentenceEnds(text);
  if (ends.length > 0) {
    const sentenceStart = ends.filter((e) => e <= start).pop() ?? 0;
    const sentenceEnd = ends.find((e) => e >= end);
    if (sentenceEnd !== undefined) {
      const words = text.slice(sentenceStart, sentenceEnd).split(/\s+/).filter(Boolean).length;
      if (words <= MAX_SENTENCE_WORDS) {
        return { start: sentenceStart, end: sentenceEnd, truncated: false };
      }
      const windowStart = Math.max(sentenceStart, cutStart(text, start, WINDOW_WORDS));
      const windowEnd = Math.min(sentenceEnd, cutEnd(text, end, WINDOW_WORDS));
      return { start: windowStart, end: windowEnd, truncated: true };
    }
  }
  return {
    start: cutStart(text, start, WINDOW_WORDS),
    end: cutEnd(text, end, WINDOW_WORDS),
    truncated: true,
  };
}

function build(
  text: string,
  matchStart: number,
  matchEnd: number,
  slice: Slice,
  matchOverride?: string,
): CollocationExample {
  const lead = slice.truncated && slice.start > 0 ? "…" : "";
  const tail = slice.truncated && slice.end < text.length ? "…" : "";
  return {
    before: `${lead}${text.slice(slice.start, matchStart).replace(MARKER_BEFORE_BLANK_RE, "").trim()}`,
    match: matchOverride ?? text.slice(matchStart, matchEnd),
    after: `${text.slice(matchEnd, slice.end).trim()}${tail}`,
  };
}

/**
 * 填空题：用正确答案补空，得到搭配在原句里的样子。
 * `marker` 优先（Part 6 文章的 `(131)` 标记），其次 `blankIndex`，最后取第一个空。
 */
export function fillBlankExample(
  text: string,
  answer: string,
  options: FillBlankOptions = {},
): CollocationExample | null {
  if (!text || !answer) return null;
  const blanks = [...text.matchAll(BLANK_RE)];
  if (blanks.length === 0) return null;

  let target = options.blankIndex ?? 0;
  if (options.marker !== undefined) {
    const markerRe = new RegExp(`\\(\\s*${options.marker}\\s*\\)`);
    const marker = markerRe.exec(text);
    if (marker) {
      const next = blanks.findIndex((b) => b.index !== undefined && b.index > marker.index + marker[0].length);
      if (next >= 0) target = next;
    }
  }

  const blank = blanks[target];
  if (!blank || blank.index === undefined) return null;
  const slice = contextSlice(text, blank.index, blank.index + blank[0].length);
  return build(text, blank.index, blank.index + blank[0].length, slice, answer);
}

/** 阅读题：在文章里定位这个搭配，取它所在的那一句（或退化窗口）。 */
export function expressionExample(text: string, expression: string): CollocationExample | null {
  const pattern = expressionPattern(expression);
  if (!pattern || !text) return null;

  const ends = sentenceEnds(text);
  const bounds = [0, ...ends, text.length];
  for (let i = 0; i + 1 < bounds.length; i++) {
    const start = bounds[i];
    const end = bounds[i + 1];
    if (end <= start) continue;
    const sentence = text.slice(start, end);
    const hit = pattern.exec(sentence);
    if (!hit) continue;
    const matchStart = start + hit.index;
    const matchEnd = matchStart + hit[0].length;
    return build(text, matchStart, matchEnd, contextSlice(text, matchStart, matchEnd));
  }
  return null;
}

/**
 * 一道真题的「原句」：填空题补答案，阅读题找搭配所在的句子。
 * 找不到（文章正文缺失、搭配只出现在选项里、单锚点搭配）返回 null，页面就不显示。
 */
export function questionExample(src: ExampleSource): CollocationExample | null {
  if (src.part === 5) {
    return (
      fillBlankExample(src.stem, src.answerText) ?? expressionExample(src.stem, src.expression)
    );
  }
  const passage = src.passageText;
  if (!passage) return null;
  if (src.blankIndex !== undefined) {
    const filled = fillBlankExample(passage, src.answerText, {
      marker: src.number,
      blankIndex: src.blankIndex,
    });
    if (filled) return filled;
  }
  return expressionExample(passage, src.expression);
}
