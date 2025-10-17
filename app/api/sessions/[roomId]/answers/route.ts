import { NextRequest, NextResponse } from "next/server";
import { getCurrentQuestion, checkAnswer } from "@/app/lib/quizEngine";
import { addPlayerAnswer, getPlayerScore } from "@/app/lib/sessionStore";

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
  
  const { playerId, answer } = (body as Record<string, unknown>);
  
  if (typeof playerId !== "string" || typeof answer !== "string") {
    return NextResponse.json({ 
      error: "playerId and answer are required" 
    }, { status: 400 });
  }
  
  const question = getCurrentQuestion(roomId);
  if (!question) {
    return NextResponse.json({ 
      error: "No active question" 
    }, { status: 400 });
  }
  
  const isCorrect = checkAnswer(question, answer);
  const points = isCorrect ? question.answerCost : 0;
  const responseTime = Date.now(); // Время ответа
  
  // Сохраняем ответ игрока
  addPlayerAnswer(roomId, playerId, {
    questionId: question.questionID,
    answer,
    isCorrect,
    points,
    responseTime,
  });
  
  const playerScore = getPlayerScore(roomId, playerId);
  
  return NextResponse.json({
    isCorrect,
    points,
    correctAnswer: question.answer1,
    totalScore: playerScore.totalPoints,
    responseTime,
  });
}

