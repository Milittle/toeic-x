import { notFound } from "next/navigation";
import { loadTest } from "@/lib/loaders";
import { toClientTest } from "@/lib/questions";
import { PracticeClient } from "@/components/PracticeClient";

export const dynamic = "force-dynamic";

export default async function PracticePage({ params }: { params: { testId: string } }) {
  const test = await loadTest(params.testId);
  if (!test) notFound();
  return <PracticeClient test={toClientTest(test, true)} />;
}
