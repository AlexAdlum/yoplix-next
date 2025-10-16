import { NextRequest, NextResponse } from "next/server";
import { startQuiz, getCurrentQuestion, nextQuestion, endQuiz, generateRandomAnswers } from "@/app/lib/quizEngine";
import { getQuizBySlug } from "@/app/data/quizzes";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  let body: unknown = {};
  
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  
  const { action, slug } = (body as Record<string, unknown>);
  
  if (action === "start" && typeof slug === "string") {
    const quiz = getQuizBySlug(slug);
    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }
    
    const session = startQuiz(roomId, slug);
    const question = session.questions[0];
    const answers = generateRandomAnswers(question);
    
    return NextResponse.json({
      question: {
        ...question,
        answers,
      },
      mechanics: session.mechanics,
      currentQuestion: 1,
      totalQuestions: session.questions.length,
    });
  }
  
  if (action === "next") {
    const question = nextQuestion(roomId);
    if (!question) {
      return NextResponse.json({ 
        finished: true,
        message: "Викторина завершена" 
      });
    }
    
    const answers = generateRandomAnswers(question);
    const session = startQuiz(roomId, ""); // Получаем сессию для подсчета
    
    return NextResponse.json({
      question: {
        ...question,
        answers,
      },
      currentQuestion: session.currentQuestionIndex + 1,
      totalQuestions: session.questions.length,
    });
  }
  
  if (action === "end") {
    endQuiz(roomId);
    return NextResponse.json({ message: "Quiz ended" });
  }
  
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  
  const question = getCurrentQuestion(roomId);
  if (!question) {
    return NextResponse.json({ 
      finished: true,
      message: "No active question" 
    });
  }
  
  const answers = generateRandomAnswers(question);
  
  return NextResponse.json({
    question: {
      ...question,
      answers,
    },
  });
}
