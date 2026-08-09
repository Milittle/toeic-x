import { redirect } from "next/navigation";

// The curated 300-item learning list was merged into the full 894-item
// collocation library (搭配库). This route now redirects there so old
// bookmarks/links keep working.
export default function LearningListPage() {
  redirect("/collocations");
}
