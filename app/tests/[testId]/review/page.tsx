import { notFound } from "next/navigation";
import { loadTest } from "@/lib/content/question-bank";
import { toPracticeTest, flattenClientTest } from "@/lib/domain/questions";
import { getAnswers, getMarks } from "@/lib/application/review";
import { completedTimedAttemptForTest, firstTimedAttempt } from "@/lib/application/attempts";
import { ReviewClient, type ReviewItem } from "@/components/ReviewClient";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: { testId: string };
  searchParams: { from?: string };
}) {
  const test = await loadTest(params.testId);
  if (!test) notFound();

  const requestedAttemptId = searchParams.from ? Number(searchParams.from) : undefined;
  const requestedAttempt =
    requestedAttemptId && Number.isInteger(requestedAttemptId) && requestedAttemptId > 0
      ? completedTimedAttemptForTest(test.testId, requestedAttemptId)
      : undefined;
  const attemptId = requestedAttempt?.id ?? firstTimedAttempt(test.testId)?.id;
  if (!attemptId) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8 text-sm text-slate-500">
        还没有可复盘的模拟成绩。先完成一次 75 分钟模拟。
      </main>
    );
  }

  const answers = new Map(getAnswers(attemptId).map((a) => [a.questionNumber, a]));
  const marks = getMarks(attemptId);

  const items: ReviewItem[] = flattenClientTest(toPracticeTest(test)).map((it) => {
    const ans = answers.get(it.question.number);
    return {
      number: it.question.number,
      stem: it.question.stem,
      options: it.question.options,
      answer: it.question.answer!,
      explanation: it.question.explanation ?? "",
      translation: it.question.translation ?? "",
      passage: it.passage,
      showPassage: it.showPassage,
      selected: (ans?.selected ?? null) as ReviewItem["selected"],
      isCorrect: ans ? ans.isCorrect === 1 : null,
      mark: marks.get(it.question.number) ?? null,
    };
  });

  return <ReviewClient testId={test.testId} title={test.title} attemptId={attemptId} items={items} />;
}
