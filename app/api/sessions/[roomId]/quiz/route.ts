import { NextRequest, NextResponse } from "next/server";
import { startQuiz, getCurrentQuestion, nextQuestion, endQuiz, generateRandomAnswers, getGameSession, getGameStatus } from "@/app/lib/quizEngine";
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
    
    if (session.questions.length === 0) {
      return NextResponse.json({ error: "No questions found for this quiz" }, { status: 404 });
    }
    
    const question = session.questions[0];
    const answers = generateRandomAnswers(question, roomId);
    
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
    
    const answers = generateRandomAnswers(question, roomId);
    const session = getGameSession(roomId);
    
    return NextResponse.json({
      question: {
        ...question,
        answers,
      },
      currentQuestion: (session?.currentQuestionIndex ?? 0) + 1,
      totalQuestions: session?.questions.length || 0,
    });
  }
  
  if (action === "end") {
    endQuiz(roomId);
    return NextResponse.json({ message: "Quiz ended" });
  }
  
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const { searchParams } = new URL(req.url);
  const checkStatus = searchParams.get('status');
  
  // Если запрашивается только статус игры
  if (checkStatus === 'true') {
    const status = getGameStatus(roomId);
    if (!status) {
      return NextResponse.json({ 
        isGameStarted: false,
        isActive: false,
        message: "No game session found" 
      });
    }
    return NextResponse.json(status);
  }
  
  // Обычная логика получения вопроса
  const question = getCurrentQuestion(roomId);
  const session = getGameSession(roomId);
  
  if (!question || !session) {
    return NextResponse.json({ 
      finished: true,
      message: "No active question" 
    });
  }
  
  const answers = generateRandomAnswers(question, roomId);
  
  return NextResponse.json({
    question: {
      ...question,
      answers,
    },
    currentQuestion: session.currentQuestionIndex + 1,
    totalQuestions: session.questions.length,
    session: {
      isActive: session.isActive,
      isGameStarted: session.isGameStarted,
    }
  });
}
