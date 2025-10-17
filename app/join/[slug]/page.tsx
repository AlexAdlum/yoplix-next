import { notFound } from "next/navigation";
import { getQuizBySlug } from "@/app/data/quizzes";
import JoinPageClient from "./JoinPageClient";

interface JoinPageProps {
  params: Promise<{ slug: string }>;
}

export default async function JoinPage({ params }: JoinPageProps) {
  const { slug } = await params;
  const quiz = getQuizBySlug(slug);

  if (!quiz) {
    notFound();
  }

  return <JoinPageClient quiz={quiz} slug={slug} />;
}