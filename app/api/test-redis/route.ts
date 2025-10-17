import { NextResponse } from "next/server";
import { RedisStorage } from "@/app/lib/redis";

export async function GET() {
  try {
    console.log('Testing Upstash Redis connection...');
    
    // Тест 1: Проверяем переменные окружения
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    console.log('Environment variables:');
    console.log('UPSTASH_REDIS_REST_URL:', redisUrl ? '✓ Present' : '✗ Missing');
    console.log('UPSTASH_REDIS_REST_TOKEN:', redisToken ? '✓ Present' : '✗ Missing');
    
    if (!redisUrl || !redisToken) {
      return NextResponse.json({
        success: false,
        error: 'Redis environment variables not configured',
        details: {
          url: redisUrl ? 'present' : 'missing',
          token: redisToken ? 'present' : 'missing'
        }
      }, { status: 500 });
    }
    
    // Тест 2: Проверяем подключение к Redis
    const testKey = 'test:connection';
    
    await RedisStorage.setRoom(testKey, { test: 'connection', timestamp: Date.now() });
    const retrieved = await RedisStorage.getRoom(testKey);
    
    if (!retrieved) {
      return NextResponse.json({
        success: false,
        error: 'Failed to store/retrieve data from Redis'
      }, { status: 500 });
    }
    
    // Тест 3: Проверяем создание игровой сессии
    const testRoomId = 'test-room-' + Date.now();
    const testSession = {
      roomId: testRoomId,
      currentQuestionIndex: 0,
      questions: [{ questionID: 'test', question: 'Test question' }],
      mechanics: null,
      isActive: true,
      isGameStarted: true,
      questionStartTime: Date.now()
    };
    
    await RedisStorage.setGameSession(testRoomId, testSession);
    const retrievedSession = await RedisStorage.getGameSession(testRoomId);
    
    if (!retrievedSession) {
      return NextResponse.json({
        success: false,
        error: 'Failed to store/retrieve game session from Redis'
      }, { status: 500 });
    }
    
    // Очищаем тестовые данные
    await RedisStorage.deleteRoom(testKey);
    await RedisStorage.deleteGameSession(testRoomId);
    
    return NextResponse.json({
      success: true,
      message: 'Redis connection successful',
      tests: {
        environmentVariables: '✓',
        basicConnection: '✓',
        gameSessionStorage: '✓'
      },
      retrievedSession: {
        isActive: retrievedSession.isActive,
        isGameStarted: retrievedSession.isGameStarted,
        questionsCount: Array.isArray(retrievedSession.questions) ? retrievedSession.questions.length : 0
      }
    });
    
  } catch (error) {
    console.error('Redis test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Redis connection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
