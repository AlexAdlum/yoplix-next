import { NextRequest, NextResponse } from "next/server";
import { getCurrentQuestion, checkAnswer } from "@/app/lib/quizEngineRedis";
import { addPlayerAnswer, getPlayerScore } from "@/app/lib/sessionStoreRedis";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    console.log('API POST /answers - roomId:', roomId);
    
    let body: unknown = {};
    
    try {
      body = await req.json();
      console.log('API POST /answers - body:', body);
    } catch (error) {
      console.error('API POST /answers - JSON parse error:', error);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    
    const { playerId, answer } = (body as Record<string, unknown>);
    console.log('API POST /answers - playerId:', playerId, 'answer:', answer);
    
    if (typeof playerId !== "string" || typeof answer !== "string") {
      console.error('API POST /answers - validation failed:', {
        playerIdType: typeof playerId,
        answerType: typeof answer
      });
      return NextResponse.json({ 
        error: "playerId and answer are required" 
      }, { status: 400 });
    }
    
    const question = await getCurrentQuestion(roomId);
    console.log('API POST /answers - question:', question ? 'found' : 'not found');
    
    if (!question) {
      console.error('API POST /answers - no active question for roomId:', roomId);
      return NextResponse.json({ 
        error: "No active question" 
      }, { status: 400 });
    }
    
    const isCorrect = checkAnswer(question, answer);
    const points = isCorrect ? question.answerCost : 0;
    const responseTime = Date.now(); // Время ответа
    
    console.log('API POST /answers - result:', { isCorrect, points, correctAnswer: question.answer1 });
    
    // Сохраняем ответ игрока
    await addPlayerAnswer(roomId, playerId, {
      questionId: question.questionID,
      answer,
      isCorrect,
      points,
      responseTime,
    });
    
    const playerScore = await getPlayerScore(roomId, playerId);
    console.log('API POST /answers - player score:', playerScore);
    
    return NextResponse.json({
      isCorrect,
      points,
      correctAnswer: question.answer1,
      totalScore: playerScore.totalPoints,
      responseTime,
    });
    
  } catch (error) {
    console.error('API POST /answers - unexpected error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

