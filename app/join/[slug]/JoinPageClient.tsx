"use client";
import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

const avatars = [
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Ava1",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Ava2",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Ava3",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Ava4",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Ava5",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Ava6",
];

interface JoinPageClientProps {
  quiz: {
    title: string;
    description: string;
    type: string;
    questions?: number;
    duration?: string;
    price: number;
  };
  slug: string;
}

export default function JoinPageClient({ quiz, slug }: JoinPageClientProps) {
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
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState<boolean>(false);

  const channelName = useMemo(() => `yoplix-join-${slug}`, [slug]);

  // Read roomId from query
  useEffect(() => {
    if (typeof window === "undefined") return;
    const room = new URLSearchParams(window.location.search).get("room");
    console.log('Join page - extracted room from URL:', room);
    if (room) {
      setRoomId(room);
      console.log('Join page - roomId set to:', room);
    } else {
      console.error('Join page - no room parameter in URL');
    }
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

  async function handleReady() {
    if (!nickname.trim()) {
      console.log('handleReady - nickname is empty');
      alert('Введите имя игрока');
      return;
    }
    if (!roomId) {
      console.log('handleReady - no roomId');
      alert('Комната не найдена. Проверьте ссылку.');
      return;
    }
    
    console.log('handleReady - roomId:', roomId);
    console.log('handleReady - nickname:', nickname.trim());
    console.log('handleReady - avatar:', avatar);
    
    // Сначала проверим, существует ли комната
    try {
      console.log('handleReady - checking if room exists...');
      const roomCheckResponse = await fetch(`/api/sessions/${roomId}/players`, {
        method: "GET",
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      console.log('handleReady - room check response status:', roomCheckResponse.status);
      
      if (!roomCheckResponse.ok) {
        console.error('handleReady - room does not exist');
        alert('Комната не найдена или была закрыта');
        return;
      }
      
      console.log('handleReady - room exists, proceeding with join');
    } catch (error) {
      console.error('handleReady - error checking room:', error);
      alert('Ошибка проверки комнаты');
      return;
    }
    
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
        headers: { 
          "Content-Type": "application/json",
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify(player),
      });
      
      console.log('handleReady - response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('handleReady - response data:', data);
        setJoined(true);
        console.log('handleReady - player joined successfully');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        console.error('handleReady - error response:', errorData);
        alert(`Ошибка присоединения: ${errorData.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('handleReady - network error:', error);
      alert('Ошибка сети при присоединении к игре');
    }
  }

  async function handleAnswerSelect(answer: string) {
    if (!roomId || !playerId || !currentQuestion || isSubmittingAnswer) {
      console.log('handleAnswerSelect - blocked:', { roomId: !!roomId, playerId: !!playerId, currentQuestion: !!currentQuestion, isSubmittingAnswer });
      return;
    }
    
    setIsSubmittingAnswer(true);
    console.log('handleAnswerSelect - submitting answer:', answer);
    
    try {
      const res = await fetch(`/api/sessions/${roomId}/answers`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'Cache-Control': 'no-cache'
        },
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
          setIsSubmittingAnswer(false);
        }, 3000);
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Failed to parse error response' }));
        console.error('handleAnswerSelect - error response:', errorData);
        alert(`Ошибка отправки ответа: ${errorData.error || 'Неизвестная ошибка'}`);
        setIsSubmittingAnswer(false);
      }
    } catch (error) {
      console.error('handleAnswerSelect - network error:', error);
      alert('Ошибка сети при отправке ответа');
      setIsSubmittingAnswer(false);
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
                  <Image
                    src={a}
                    alt="avatar"
                    width={64}
                    height={64}
                    unoptimized
                    className="w-16 h-16 rounded-full"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/avatar-fallback.png';
                    }}
                  />
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 mb-6">
              <Image
                src={avatar}
                alt="chosen avatar"
                width={48}
                height={48}
                unoptimized
                className="w-12 h-12 rounded-full"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/avatar-fallback.png';
                }}
              />
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
                        disabled={isSubmittingAnswer}
                        className={`p-4 text-left rounded-xl transition-colors border ${
                          isSubmittingAnswer 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' 
                            : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                        }`}
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
