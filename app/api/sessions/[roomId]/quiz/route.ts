import { NextRequest, NextResponse } from "next/server";
import { startQuiz, getCurrentQuestion, nextQuestion, endQuiz, generateRandomAnswers, getGameSession, getGameStatus } from "@/app/lib/quizEngineRedis";
import { getQuizBySlug } from "@/app/data/quizzes";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    console.log('API POST /quiz - roomId:', roomId);
    
    let body: unknown = {};
    
    try {
      body = await req.json();
      console.log('API POST /quiz - body:', body);
    } catch (error) {
      console.error('API POST /quiz - JSON parse error:', error);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    
    const { action, slug } = (body as Record<string, unknown>);
    console.log('API POST /quiz - action:', action, 'slug:', slug);
    
    if (action === "start" && typeof slug === "string") {
      console.log('API POST /quiz - starting quiz for slug:', slug);
      
      try {
        const quiz = getQuizBySlug(slug);
        if (!quiz) {
          console.error('API POST /quiz - quiz not found:', slug);
          return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
        }
        
        const session = await startQuiz(roomId, slug);
        console.log('API POST /quiz - session created:', session);
        
        if (session.questions.length === 0) {
          console.error('API POST /quiz - no questions found');
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
      } catch (error) {
        console.error('API POST /quiz - start error:', error);
        return NextResponse.json({ error: "Failed to start quiz" }, { status: 500 });
      }
    }
    
    if (action === "next") {
      console.log('API next - roomId:', roomId);
      
      try {
        const session = await getGameSession(roomId);
        console.log('API next - current session:', session);
        
        const question = await nextQuestion(roomId);
        console.log('API next - next question:', question);
        
        if (!question) {
          console.log('API next - quiz finished, returning finished response');
          return NextResponse.json({ 
            finished: true,
            message: "Викторина завершена" 
          });
        }
        
        const answers = generateRandomAnswers(question, roomId);
        const updatedSession = await getGameSession(roomId);
        console.log('API next - updated session:', updatedSession);
        
        return NextResponse.json({
          question: {
            ...question,
            answers,
          },
          currentQuestion: (updatedSession?.currentQuestionIndex ?? 0) + 1,
          totalQuestions: updatedSession?.questions.length || 0,
        });
      } catch (error) {
        console.error('API POST /quiz - next error:', error);
        return NextResponse.json({ error: "Failed to get next question" }, { status: 500 });
      }
    }
    
    if (action === "end") {
      console.log('API POST /quiz - ending quiz');
      try {
        await endQuiz(roomId);
        return NextResponse.json({ message: "Quiz ended" });
      } catch (error) {
        console.error('API POST /quiz - end error:', error);
        return NextResponse.json({ error: "Failed to end quiz" }, { status: 500 });
      }
    }
    
    console.error('API POST /quiz - invalid action:', action);
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    
  } catch (error) {
    console.error('API POST /quiz - unexpected error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    console.log('API GET /quiz - roomId:', roomId);
    
    const { searchParams } = new URL(req.url);
    const checkStatus = searchParams.get('status');
    console.log('API GET /quiz - checkStatus:', checkStatus);
    
    // Если запрашивается только статус игры
    if (checkStatus === 'true') {
      try {
        const status = await getGameStatus(roomId);
        console.log('API GET /quiz - status:', status);
        
        if (!status) {
          return NextResponse.json({ 
            isGameStarted: false,
            isActive: false,
            message: "No game session found" 
          });
        }
        return NextResponse.json(status);
      } catch (error) {
        console.error('API GET /quiz - status error:', error);
        return NextResponse.json({ 
          isGameStarted: false,
          isActive: false,
          message: "Error getting status" 
        }, { status: 500 });
      }
    }
    
    // Обычная логика получения вопроса
    try {
      const question = await getCurrentQuestion(roomId);
      const session = await getGameSession(roomId);
      
      console.log('API GET /quiz - question:', question ? 'found' : 'not found');
      console.log('API GET /quiz - session:', session ? 'found' : 'not found');
      
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
    } catch (error) {
      console.error('API GET /quiz - question error:', error);
      return NextResponse.json({ 
        finished: true,
        message: "Error getting question" 
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('API GET /quiz - unexpected error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
