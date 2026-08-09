"""Tests for the TOEIC question-bank extractor.

Unit tests use small *real* text fragments taken from the book's pdftotext
output. The integration test runs against the full extracted text file when it
is present.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

import extract_question_bank as mod

REPO = Path(__file__).resolve().parent.parent
SRC = REPO / ".cache" / "material-index" / "reading.txt"


# --------------------------------------------------------------------------- #
# parse_options
# --------------------------------------------------------------------------- #
def test_parse_options_four_on_separate_lines():
    region = "(A) If\n     (B) For\n     (C) Despite (D) Whether"
    assert mod.parse_options(region) == {
        "A": "If", "B": "For", "C": "Despite", "D": "Whether",
    }


def test_parse_options_two_per_line():
    region = "(A) her (B) hers\n     (C) herself (D) she"
    assert mod.parse_options(region) == {
        "A": "her", "B": "hers", "C": "herself", "D": "she",
    }


def test_parse_options_missing_label_returns_empty():
    assert mod.parse_options("(A) only this") == {}


# --------------------------------------------------------------------------- #
# answer grid (wraps across lines, blank rows between bands)
# --------------------------------------------------------------------------- #
GRID_SLICE = """\
                                    Test 01

     101. (A) 102. (A) 103. (C) 104. (C) 105. (D) 106. (A) 107. (D) 108. (B) 109.
(A) 110. (B)

     111. (A) 112. (C) 113. (A) 114. (D) 115. (B) 116. (A) 117. (A) 118. (C) 119.
(A) 120. (C)

     121. (C) 122. (D) 123. (C) 124. (D) 125. (C) 126. (D) 127. (B) 128. (D) 129.
(B) 130. (C)

Something that is not part of the grid anymore.
"""


def test_answer_grid_handles_wrap_and_blanks():
    answers = mod._parse_answer_grid(GRID_SLICE.splitlines())
    # the wrapped numbers 109, 119, 129 must be recovered
    assert answers[101] == "A"
    assert answers[109] == "A"
    assert answers[110] == "B"
    assert answers[119] == "A"
    assert answers[129] == "B"
    assert answers[130] == "C"
    assert len(answers) == 30
    # the trailing prose line is not consumed
    assert 131 not in answers


# --------------------------------------------------------------------------- #
# explanation blocks (markers differ by part)
# --------------------------------------------------------------------------- #
def test_explanation_block_part5_translation_and_explanation():
    block = """\
105 In order to become a member of the country club, applicants have to meet the
strict ------- set by the club president.

     (A) require (B) requires

     (C) requiring (D) requirements

  ▶为了成为乡村俱乐部的会员，申请人必须满足俱乐部主席制订的严格
要求。

     ▶解析 横线处所填单词被形容词strict修饰，且充当meet的宾语，
故名词(D)requirements为正确答案。
""".splitlines()
    translation, explanation = mod._parse_explanation_block(block)
    assert translation.startswith("为了成为乡村俱乐部的会员")
    assert "requirements" in explanation
    assert "▶" not in explanation


def test_explanation_block_part7_arrow_marker():
    block = """\
147 What is the main purpose of this letter?

     (A) To provide information about the club's history

     (B) To notify the members of a yearly meeting

     这封信的主要目的是什么？

     (A) 介绍俱乐部的历史

   →一般在信件的开头和结尾都会叙述写信的目的。故答案为(D)。
""".splitlines()
    translation, explanation = mod._parse_explanation_block(block)
    assert "这封信的主要目的是什么" in translation
    assert explanation.startswith("一般在信件的开头")
    assert "(D)" in explanation


def test_explanation_block_drops_trailing_vocab_list():
    block = """\
110. The majority of the contract ------- that took place during the year were

     (A) negotiation (B) negotiations

  ▶今年的大部分合同谈判都是由一家当地律师事务所的律师处理的。

     ▶解析 the majority of...后应接名词。故选(B)。

     handle 处理，操作

     construction 建设
""".splitlines()
    _, explanation = mod._parse_explanation_block(block)
    assert "handle" not in explanation
    assert "construction" not in explanation
    assert explanation.endswith("故选(B)。")


# --------------------------------------------------------------------------- #
# question-book slice (P5 + a P6 passage set)
# --------------------------------------------------------------------------- #
QB_SLICE = """\
      Part 5

      Directions: filler text.

101. ------- you want to receive additional information regarding the services we
offer, please log onto our website today.

     (A) If
     (B) For
     (C) Despite
     (D) Whether

                                         793
      Part 6

      Directions: filler text.

Questions 131-134 refer to the following article.

      Bank Mortgage Rates Will Fall

      Several of Canada's largest banks (131) -------- to decrease their mortgage
rates. Royal Bank revealed its plan. Vancouver Trust has also jumped on the
wagon by announcing that it is planning to (133) -------- its rates. (134) --------.

131. (A) decide
     (B) deciding
     (C) was decided
     (D) have decided

132. (A) margin
     (B) allowance
     (C) space
     (D) surplus
"""


def test_question_book_part5_and_part6_structure():
    part5, part6, part7 = mod._parse_question_book_test(QB_SLICE.splitlines())

    assert [q.number for q in part5] == [101]
    assert part5[0].options == {"A": "If", "B": "For", "C": "Despite", "D": "Whether"}
    assert "793" not in part5[0].stem  # page number must not leak into the stem

    assert len(part6) == 1
    ps = part6[0]
    assert (ps.start, ps.end) == (131, 134)
    assert ps.descriptor == "article"
    assert ps.title == "Bank Mortgage Rates Will Fall"
    assert "(131)" in ps.text
    assert [q.number for q in ps.questions] == [131, 132]
    assert ps.questions[0].stem == ""  # P6 blank question: stem lives in the passage
    assert ps.questions[0].options["D"] == "have decided"


def test_question_book_ignores_address_starting_with_number():
    """A street address inside a passage must not be mistaken for a question."""
    slice_ = """\
Questions 151-152 refer to the following letter.

      152 Whacker Road
      Chicago, IL 60601

      Dear Sir,

151. What is the purpose of the letter?
     (A) x
     (B) y
     (C) z
     (D) w

152. What will the reader do?
     (A) x
     (B) y
     (C) z
     (D) w
"""
    _, _, part7 = mod._parse_question_book_test(slice_.splitlines())
    assert len(part7) == 1
    ps = part7[0]
    assert [q.number for q in ps.questions] == [151, 152]
    assert ps.questions[0].stem.startswith("What is the purpose")
    assert "Whacker" not in ps.questions[1].stem


# --------------------------------------------------------------------------- #
# Integration: the real extracted text (skip if absent)
# --------------------------------------------------------------------------- #
@pytest.mark.skipif(not SRC.exists(), reason="reading.txt not available")
def test_parse_book_full_extraction():
    tests = mod.parse_book(SRC.read_text(encoding="utf-8"))

    assert len(tests) == 10
    for test in tests:
        numbers = set()
        for part in test["parts"]:
            qs = part["questions"] if part["part"] == 5 else [
                q for ps in part.get("passages", []) for q in ps["questions"]
            ]
            for q in qs:
                numbers.add(q["number"])
                assert set(q["options"]) == {"A", "B", "C", "D"}
                assert all(q["options"].values())
                assert q["answer"] in "ABCD"
        # every test has all 100 questions, numbered 101-200
        assert numbers == set(range(101, 201)), test["testId"]

    # spot-check a known answer (Test 01, Q101 = A)
    q101 = _find(tests[0], 101)
    assert q101["answer"] == "A"
    assert q101["options"]["A"] == "If"


def _find(test, number):
    for part in test["parts"]:
        qs = part["questions"] if part["part"] == 5 else [
            q for ps in part.get("passages", []) for q in ps["questions"]
        ]
        for q in qs:
            if q["number"] == number:
                return q
    raise KeyError(number)
