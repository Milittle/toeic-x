import { notFound } from "next/navigation";
import { loadTest } from "@/lib/content/question-bank";
import { toPracticeTest } from "@/lib/domain/questions";
import { startPracticeAttempt } from "@/lib/application/attempts";
import { PracticeClient } from "@/components/PracticeClient";

export const dynamic = "force-dynamic";

export default async function PracticePage({ params }: { params: { testId: string } }) {
  const test = await loadTest(params.testId);
  if (!test) notFound();
  const attempt = startPracticeAttempt(test.testId);
  return <PracticeClient test={toPracticeTest(test)} attemptId={attempt.id} />;
}
