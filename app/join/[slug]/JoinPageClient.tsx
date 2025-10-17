"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const avatars = [
  "https://api.dicebear.com/9.x/bottts/svg?seed=Ava1",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Ava2",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Ava3",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Ava4",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Ava5",
  "https://api.dicebear.com/9.x/bottts/svg?seed=Ava6",
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

export default function JoinPageClient({ quiz }: JoinPageClientProps) {
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

  // Извлекаем roomId из URL при загрузке страницы
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
          // Скрываем результат когда приходит новый вопрос
          setShowResult(false);
          setIsSubmittingAnswer(false);
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
    const channelName = `quiz-${roomId}`;
    const channel = new BroadcastChannel(channelName);
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "quiz:start") {
        setStarted(true);
      }
    };
    channel.addEventListener("message", handler);
    return () => channel.close();
  }, [roomId]);

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
      // Всегда проверяем новые вопросы, но результат скроется автоматически
      await loadCurrentQuestion();
    }, 2000); // Проверяем каждые 2 секунды
    
    return () => {
      console.log('Cleaning up question polling');
      clearInterval(interval);
    };
  }, [roomId, started, loadCurrentQuestion]);

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
        
        // Результат будет скрыт когда придет следующий вопрос
        setIsSubmittingAnswer(false);
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
                  <img src={a} alt="avatar" className="w-16 h-16" />
                </button>
              ))}
            </div>

            <div className="mb-6">
              <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-2">
                Ваш никнейм
              </label>
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Введите ваш никнейм"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                maxLength={20}
              />
            </div>

            <button
              onClick={handleReady}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold rounded-xl hover:scale-105 transition-transform shadow-lg"
            >
              Готов играть!
            </button>
          </div>
        ) : !started ? (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Ожидание начала игры</h2>
              <p className="text-gray-600">Ведущий скоро запустит викторину</p>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-600">
                <strong>Ваш никнейм:</strong> {nickname}
              </p>
              <div className="mt-2 flex items-center justify-center gap-2">
                <span className="text-sm text-gray-600">Аватар:</span>
                <img src={avatar} alt="avatar" className="w-8 h-8 rounded-full" />
              </div>
            </div>
          </div>
        ) : showResult ? (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
              isCorrect ? 'bg-green-100' : 'bg-red-100'
            }`}>
              {isCorrect ? (
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            
            <h2 className={`text-2xl font-bold mb-2 ${
              isCorrect ? 'text-green-600' : 'text-red-600'
            }`}>
              {isCorrect ? 'Правильно!' : 'Неправильно'}
            </h2>
            
            <div className="bg-gray-50 rounded-xl p-4 mt-6">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Ваш счет:</strong> {playerScore} очков
              </p>
              <p className="text-xs text-gray-500">
                Ожидание следующего вопроса...
              </p>
            </div>
          </div>
        ) : currentQuestion ? (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                {(currentQuestion as { question: string }).question}
              </h2>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-600">
                  <strong>Ваш счет:</strong> {playerScore} очков
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {(currentQuestion as { answers: string[] }).answers?.map((answer: string, index: number) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(answer)}
                  disabled={isSubmittingAnswer}
                  className={`w-full p-4 text-left rounded-xl transition-colors border ${
                    isSubmittingAnswer
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                      : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                  }`}
                >
                  {answer}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Игра завершена!</h2>
              <p className="text-gray-600">Спасибо за участие!</p>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-600">
                <strong>Ваш итоговый счет:</strong> {playerScore} очков
              </p>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-gray-800 text-white py-8 mt-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm text-gray-300">
              © Yoplix, 2025
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
