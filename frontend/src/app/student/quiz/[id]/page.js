import { redirect } from "next/navigation";

// The old quiz player. Every quiz now runs on /quizzes/[id] (one mode, instant
// feedback, resume); old links and bookmarks are sent there.
export default async function OldQuizPlayer({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const guest = sp?.guest_session;
  redirect(`/quizzes/${encodeURIComponent(id)}${guest ? `?guest_session=${encodeURIComponent(guest)}` : ""}`);
}
