import { describe, expect, it } from "vitest";

import {
  expressionExample,
  expressionPattern,
  fillBlankExample,
  questionExample,
} from "./collocation-example";

// 真实题库文本（Test 01 P5 Q110、Test 02 P5 Q128、Test 01 P6 文章）
const P5_STEM =
  "The majority of the contract ------- that took place during the year were handled by lawyers from a local law firm.";
const MULTI_DASH_STEM =
  "The new dome built in the center of town houses many new facilities, including a hotel with rooms that have a spectacular view of the stadium that is ---- ---.";
const P6_SENTENCE =
  "Several of Canada’s largest banks (131) -------- to decrease their mortgage rates. Royal Bank revealed its plan.";

describe("fillBlankExample", () => {
  it("用正确答案补 Part 5 题干里的空", () => {
    expect(fillBlankExample(P5_STEM, "negotiations")).toEqual({
      before: "The majority of the contract",
      match: "negotiations",
      after: "that took place during the year were handled by lawyers from a local law firm.",
    });
  });

  it("PDF 断成两段的横线算同一个空", () => {
    const ex = fillBlankExample(MULTI_DASH_STEM, "impressive");
    expect(ex?.match).toBe("impressive");
    expect(ex?.before.endsWith("that is")).toBe(true);
    expect(ex?.after).toBe(".");
  });

  it("Part 6 按 (131) 标记定位空位，并去掉标记本身", () => {
    expect(fillBlankExample(P6_SENTENCE, "have decided", { marker: 131 })).toEqual({
      before: "Several of Canada’s largest banks",
      match: "have decided",
      after: "to decrease their mortgage rates.",
    });
  });

  it("没有题号标记时按第几个空兜底", () => {
    const text = "The first gap -------- and the second one ________ both need answers.";
    expect(fillBlankExample(text, "one", { blankIndex: 0 })?.match).toBe("one");
    expect(fillBlankExample(text, "two", { blankIndex: 1 })).toEqual({
      before: "The first gap -------- and the second one",
      match: "two",
      after: "both need answers.",
    });
  });

  it("没有空位、文本或答案为空时返回 null", () => {
    expect(fillBlankExample("There is no blank here.", "x")).toBeNull();
    expect(fillBlankExample("", "x")).toBeNull();
    expect(fillBlankExample("a -------- b", "")).toBeNull();
  });
});

describe("expressionExample", () => {
  it("取搭配所在的那一句，而不是整段", () => {
    expect(expressionExample("We are aware of the problem. The manager will fix it tomorrow.", "be aware of")).toEqual({
      before: "We",
      match: "are aware of",
      after: "the problem.",
    });
  });

  it("句子过长时只给搭配周围的窗口，并补省略号", () => {
    const text = `${"alpha ".repeat(30)}take advantage of this offer ${"beta ".repeat(30)}`;
    const ex = expressionExample(text, "take advantage of");
    expect(ex?.match).toBe("take advantage of");
    expect(ex?.before.startsWith("…")).toBe(true);
    expect(ex?.before.replace("…", "").split(/\s+/).filter(Boolean)).toHaveLength(12);
    expect(ex?.after.endsWith("…")).toBe(true);
    expect(ex?.after.replace("…", "").split(/\s+/).filter(Boolean)).toHaveLength(12);
  });

  it("首词认常见变形", () => {
    expect(expressionExample("The panel has decided to postpone the vote.", "have decided to")?.match).toBe(
      "has decided to",
    );
  });

  it("搭配不在文中时返回 null", () => {
    expect(expressionExample("This passage never mentions it.", "be aware of")).toBeNull();
  });

  it("单锚点搭配不参与匹配（避免到处乱命中）", () => {
    expect(expressionPattern("offer")).toBeNull();
    expect(expressionExample("We offer a discount.", "offer")).toBeNull();
  });
});

describe("questionExample", () => {
  it("Part 5 走补空", () => {
    const ex = questionExample({
      part: 5,
      number: 110,
      stem: P5_STEM,
      answerText: "negotiations",
      expression: "the majority of",
    });
    expect(ex).toEqual({
      before: "The majority of the contract",
      match: "negotiations",
      after: "that took place during the year were handled by lawyers from a local law firm.",
    });
  });

  it("Part 6 走题号标记补空", () => {
    expect(
      questionExample({
        part: 6,
        number: 131,
        stem: "",
        passageText: P6_SENTENCE,
        blankIndex: 0,
        answerText: "have decided",
        expression: "decide to",
      }),
    ).toEqual({
      before: "Several of Canada’s largest banks",
      match: "have decided",
      after: "to decrease their mortgage rates.",
    });
  });

  it("Part 6 正文缺失时返回 null（题库该文章为空）", () => {
    expect(
      questionExample({
        part: 6,
        number: 143,
        stem: "",
        passageText: "",
        blankIndex: 0,
        answerText: "secure",
        expression: "be happy to do sth.",
      }),
    ).toBeNull();
  });

  it("Part 7 走文章里的搭配定位", () => {
    expect(
      questionExample({
        part: 7,
        number: 191,
        stem: "",
        passageText: "Until March 10, take advantage of this offer: buy 5kg and get 1kg for free.",
        answerText: "D",
        expression: "take advantage of",
      }),
    ).toEqual({
      before: "Until March 10,",
      match: "take advantage of",
      after: "this offer: buy 5kg and get 1kg for free.",
    });
  });
});
