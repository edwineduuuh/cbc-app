import { redirect } from "next/navigation";

// /admin/quizzes/36 on its own has no screen - open the quiz's preview.
export default async function QuizRoot({ params }) {
  const { id } = await params;
  redirect(`/admin/quizzes/${id}/preview`);
}
