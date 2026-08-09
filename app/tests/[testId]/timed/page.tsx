import { notFound } from "next/navigation";
import { loadTest } from "@/lib/loaders";
import { toClientTest } from "@/lib/questions";
import { createAttempt } from "@/lib/attempts";
import { TimedClient } from "@/components/TimedClient";

export const dynamic = "force-dynamic";

// Opening the timed page starts an attempt and marks the test as seen.
// If the user leaves without submitting, no score is produced (spec: an
// interrupted mock leaves the test honestly marked "seen" but unscored).
export default async function TimedPage({ params }: { params: { testId: string } }) {
  const test = await loadTest(params.testId);
  if (!test) notFound();
  const attempt = createAttempt("timed", test.testId);
  return (
    <TimedClient
      test={toClientTest(test, false)}
      attemptId={attempt.id}
      startedAt={attempt.startedAt}
      isUnseenSample={attempt.isUnseenSample}
    />
  );
}
