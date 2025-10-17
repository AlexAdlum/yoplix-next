"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getQuizBySlug } from "@/app/data/quizzes";

interface JoinPageProps {
  params: { slug: string };
}

const avatars = [
  "https://api.dicebear.com/9.x/bottts/svg?seed=Ava1",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Ava2",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Ava3",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Ava4",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Ava5",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Ava6",
];

export default function JoinPage({ params }: JoinPageProps) {
  const quiz = getQuizBySlug(params.slug);
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState(avatars[0]);
  const [joined, setJoined] = useState(false);
  const [started, setStarted] = useState(false);
  const [roomId, setRoomId] = useState<string>("");
  const [playerId, setPlayerId] = useState<string>("");
  const [currentQuestion, setCurrentQuestion] = useState<unknown>(null);
  const [showResult, setShowResult] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [playerScore, setPlayerScore] = useState<number>(0);

  const channelName = useMemo(() => `yoplix-join-${params.slug}`, [params.slug]);

  // Read roomId from query
  useEffect(() => {
    if (typeof window === "undefined") return;
    const room = new URLSearchParams(window.location.search).get("room");
    if (room) setRoomId(room);
  }, []);

  const loadCurrentQuestion = useCallback(async () => {
    if (!roomId) return;
    try {
      const res = await fetch(`/api/sessions/${roomId}/quiz`);
      if (res.ok) {
        const data = await res.json();
        if (!data.finished) {
          setCurrentQuestion(data.question);
        }
      }
    } catch {}
  }, [roomId]);

  const checkGameStatus = useCallback(async () => {
    if (!roomId) return;
    try {
      const res = await fetch(`/api/sessions/${roomId}/quiz?status=true`);
      if (res.ok) {
        const data = await res.json();
        console.log('Game status check:', data);
        if (data.isGameStarted && !started) {
          console.log('Game started detected, loading first question');
          setStarted(true);
          await loadCurrentQuestion();
        }
      }
    } catch (error) {
      console.error('Error checking game status:', error);
    }
  }, [roomId, started, loadCurrentQuestion]);

  useEffect(() => {
    const channel = new BroadcastChannel(channelName);
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "quiz:start") {
        setStarted(true);
      }
    };
    channel.addEventListener("message", handler);
    return () => channel.close();
  }, [channelName]);

  // Слушаем начало игры через polling
  useEffect(() => {
    if (!roomId || started) return;
    
    console.log('Setting up game status polling for roomId:', roomId);
    
    // Проверяем статус сразу
    checkGameStatus();
    
    // Устанавливаем интервал для проверки статуса
    const interval = setInterval(checkGameStatus, 1000); // Проверяем каждую секунду
    
    return () => {
      console.log('Cleaning up game status polling');
      clearInterval(interval);
    };
  }, [roomId, started, checkGameStatus]);

  // Polling для получения текущего вопроса во время игры
  useEffect(() => {
    if (!roomId || !started) return;
    
    console.log('Setting up question polling for roomId:', roomId);
    
    // Проверяем вопрос сразу
    loadCurrentQuestion();
    
    // Устанавливаем интервал для проверки текущего вопроса
    const interval = setInterval(async () => {
      if (!showResult) { // Проверяем только если не показываем результат ответа
        await loadCurrentQuestion();
      }
    }, 2000); // Проверяем каждые 2 секунды
    
    return () => {
      console.log('Cleaning up question polling');
      clearInterval(interval);
    };
  }, [roomId, started, showResult, loadCurrentQuestion]);

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Викторина не найдена</p>
      </div>
    );
  }

  async function handleReady() {
    if (!nickname.trim()) return;
    if (!roomId) return;
    
    console.log('handleReady - roomId:', roomId);
    console.log('handleReady - nickname:', nickname.trim());
    console.log('handleReady - avatar:', avatar);
    
    const playerId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setPlayerId(playerId);
    
    const player = {
      id: playerId,
      nickname: nickname.trim(),
      avatar,
    };
    
    console.log('handleReady - sending player data:', player);
    
    try {
      const response = await fetch(`/api/sessions/${roomId}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(player),
      });
      
      console.log('handleReady - response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('handleReady - response data:', data);
        setJoined(true);
      } else {
        const errorData = await response.json();
        console.error('handleReady - error response:', errorData);
      }
    } catch (error) {
      console.error('handleReady - network error:', error);
    }
  }

  async function handleAnswerSelect(answer: string) {
    if (!roomId || !playerId || !currentQuestion) return;
    
    console.log('handleAnswerSelect - submitting answer:', answer);
    
    try {
      const res = await fetch(`/api/sessions/${roomId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, answer }),
      });
      
      console.log('handleAnswerSelect - response status:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('handleAnswerSelect - response data:', data);
        setIsCorrect(data.isCorrect);
        setPlayerScore(data.totalScore);
        setShowResult(true);
        
        // Через 3 секунды просто скрываем результат
        setTimeout(() => {
          console.log('Hiding result...');
          setShowResult(false);
        }, 3000);
      } else {
        const errorData = await res.json();
        console.error('handleAnswerSelect - error response:', errorData);
      }
    } catch (error) {
      console.error('handleAnswerSelect - network error:', error);
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-pink-50">
      <header className="bg-white shadow-lg">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-blue-500"
            >
              Yoplix
            </Link>
            <span className="text-gray-600">Присоединение к игре</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6">
          {quiz.title}
        </h1>

        {!joined ? (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <p className="text-gray-700 mb-6">Выберите аватар и укажите никнейм</p>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 mb-6">
              {avatars.map((a) => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`p-2 rounded-xl border transition-transform hover:scale-105 ${
                    avatar === a ? "border-pink-500 ring-2 ring-pink-200" : "border-gray-200"
                  }`}
                >
                  <img src={a} alt="avatar" className="w-16 h-16" />
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 mb-6">
              <img src={avatar} alt="chosen avatar" className="w-12 h-12 rounded-full" />
              <input
                type="text"
                placeholder="Ваш никнейм"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            <button
              onClick={handleReady}
              disabled={!nickname.trim()}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold rounded-xl disabled:opacity-50"
            >
              Готов
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {!started ? (
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Ожидание старта…</h2>
                <p className="text-gray-600">Ожидайте ведущего. Игра скоро начнется.</p>
              </div>
            ) : currentQuestion ? (
              <div className={`transition-all duration-500 ${showResult ? (isCorrect ? 'bg-green-50' : 'bg-red-50') : ''}`}>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-gray-500">Счёт: {playerScore}</span>
                  <span className="text-sm text-gray-500">Вопрос {(currentQuestion as { questionID: number }).questionID}</span>
                </div>
                
                <h2 className="text-xl font-bold mb-6 text-gray-800">
                  {(currentQuestion as { question: string }).question}
                </h2>
                
                {showResult ? (
                  <div className="text-center">
                    <div className={`text-2xl font-bold mb-2 ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                      {isCorrect ? '✅ Правильно!' : '❌ Неправильно'}
                    </div>
                    <p className="text-gray-600">
                      Правильный ответ: <strong>{(currentQuestion as { answer1: string }).answer1}</strong>
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {((currentQuestion as { answers: string[] }).answers || []).map((answer: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => handleAnswerSelect(answer)}
                        className="p-4 text-left bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
                      >
                        {answer}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Игра завершена!</h2>
                <p className="text-gray-600">Ваш финальный счёт: {playerScore}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}


