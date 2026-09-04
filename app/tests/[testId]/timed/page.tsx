import { notFound } from "next/navigation";
import { loadTest } from "@/lib/content/question-bank";
import { toTimedTest } from "@/lib/domain/questions";
import { startTimedAttempt } from "@/lib/application/attempts";
import { TimedClient } from "@/components/TimedClient";

export const dynamic = "force-dynamic";

// Opening the timed page starts an attempt and marks the test as seen.
// If the user leaves without submitting, no score is produced (spec: an
// interrupted mock leaves the test honestly marked "seen" but unscored).
export default async function TimedPage({ params }: { params: { testId: string } }) {
  const test = await loadTest(params.testId);
  if (!test) notFound();
  const attempt = startTimedAttempt(test.testId);
  return (
    <TimedClient
      test={toTimedTest(test)}
      attemptId={attempt.id}
      startedAt={attempt.startedAt}
      isUnseenSample={attempt.isUnseenSample}
    />
  );
}
