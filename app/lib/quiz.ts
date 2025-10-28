import type { QuizQuestion } from '@/types/quiz';
import questions from '@/app/data/questions.json';

export async function getQuestionsBySlug(slug: string): Promise<QuizQuestion[]> {
  // Простая фильтрация локального JSON (без кеша)
  const all = questions as unknown as QuizQuestion[];
  return all.filter(q => q.Slug === slug);
}


