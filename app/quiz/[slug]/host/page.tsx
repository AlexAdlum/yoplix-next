"use client";
import Link from "next/link";
import { getAvatarUrl } from "@/app/lib/avatar";
import { useEffect, useMemo, useState } from "react";
import { getQuizBySlug } from "@/app/data/quizzes";

interface HostPageProps {
  params: { slug: string };
}

type PlayerScore = {
  playerId: string;
  nickname: string;
  avatarUrl: string;
  totalPoints: number;
  correctCount: number;
  totalTimeCorrectMs: number;
};

type PlayerAnswer = {
  option: string;
  isCorrect: boolean;
  at: number;
};

type SessionState = {
  phase: 'idle' | 'question' | 'reveal';
  currentQuestionID: number | null;
  players: Record<string, PlayerScore>;
  answers: Record<string, PlayerAnswer>;
  currentQuestion?: {
    id: number;
    question: string;
    promptText?: string | null;
    options: string[];
    comment?: string | null;
  };
};

// Утилиты форматирования
function fmtSecs(n: number) {
  if (!isFinite(n) || n < 0) return '0.0s';
  return `${(n / 1000).toFixed(1)}s`;
}

function avgCorrectTime(totalMs: number, count: number) {
  return count > 0 ? totalMs / count : NaN;
}

export default function HostPage({ params }: HostPageProps) {
  const quiz = getQuizBySlug(params.slug);
  const [roomId, setRoomId] = useState<string>("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [session, setSession] = useState<SessionState | null>(null);
  const [isNextQuestionLoading, setIsNextQuestionLoading] = useState(false);
  
  const joinUrl = useMemo(() => {
    if (!roomId) return "";
    
    const domain = process.env.NEXT_PUBLIC_SITE_DOMAIN || 
      process.env.NEXT_PUBLIC_BASE_URL?.replace(/^https?:\/\//, '') || 
      'yoplix.ru';
    
    return `https://${domain}/join/${params.slug}?room=${roomId}`;
  }, [params.slug, roomId]);

  // Скрыть QR после старта
  const showQR = !session?.currentQuestionID && session?.phase !== 'question';

  // Сортировка игроков по убыванию счёта
  const playersArr = useMemo(() => {
    if (!session?.players) return [];
    const arr = Object.values(session.players);
    arr.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.correctCount !== a.correctCount) return b.correctCount - a.correctCount;
      const aAvg = avgCorrectTime(a.totalTimeCorrectMs, a.correctCount);
      const bAvg = avgCorrectTime(b.totalTimeCorrectMs, b.correctCount);
      if (isNaN(aAvg) && isNaN(bAvg)) return 0;
      if (isNaN(aAvg)) return 1;
      if (isNaN(bAvg)) return -1;
      return aAvg - bAvg;
    });
    return arr;
  }, [session?.players]);

  // Проверка, все ли ответили
  const allAnswered = useMemo(() => {
    if (!session) return false;
    const totalPlayers = Object.keys(session.players ?? {}).length;
    const totalAnswers = Object.keys(session.answers ?? {}).length;
    return totalPlayers > 0 && totalAnswers === totalPlayers;
  }, [session]);

  // Топы для финиша
  function topByPoints(players: typeof playersArr) {
    return [...players].sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 3);
  }

  function topByAvgTime(players: typeof playersArr) {
    const withAvg = players
      .filter(p => p.correctCount > 0)
      .map(p => ({ ...p, avg: p.totalTimeCorrectMs / p.correctCount }));
    return withAvg.sort((a, b) => a.avg - b.avg).slice(0, 3);
  }

  function topByCorrect(players: typeof playersArr) {
    return [...players].sort((a, b) => b.correctCount - a.correctCount).slice(0, 3);
  }

  useEffect(() => {
    async function ensureRoom() {
      if (roomId || isCreatingRoom) return;
      
      setIsCreatingRoom(true);
      try {
        const res = await fetch(`/api/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: params.slug }),
        });
        
        if (res.ok) {
          const data = (await res.json()) as { roomId: string };
          setRoomId(data.roomId);
        }
      } catch (error) {
        console.error('Error creating room:', error);
      } finally {
        setIsCreatingRoom(false);
      }
    }
    ensureRoom();

    async function fetchGameState() {
      if (!roomId) return;
      try {
        const res = await fetch(`/api/sessions/${roomId}/quiz`, {
          cache: "no-store",
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (res.ok) {
          const data = await res.json();
          if (!data.finished) {
            setSession({
              phase: data.phase || 'idle',
              currentQuestionID: data.currentQuestion?.id || null,
              players: data.players || {},
              answers: data.answers || {},
              currentQuestion: data.currentQuestion ? {
                id: data.currentQuestion,
                question: data.question?.question || '',
                promptText: data.promptText,
                options: data.question?.answers || [],
                comment: data.comment,
              } : undefined,
            });
          } else {
            // Викторина завершена
            setSession(prev => prev ? { ...prev, phase: 'idle', currentQuestionID: null } : null);
          }
        }
      } catch (error) {
        console.error('Error fetching game state:', error);
      }
    }
    
    fetchGameState();
    const timer = window.setInterval(fetchGameState, 1000);
    
    return () => window.clearInterval(timer);
  }, [params.slug, roomId, isCreatingRoom]);

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Викторина не найдена</p>
      </div>
    );
  }

  const qrSrc = joinUrl ? `/api/qr?data=${encodeURIComponent(joinUrl)}&size=256` : "";

  const handleStart = async () => {
    if (!roomId) return;
    try {
      const res = await fetch(`/api/sessions/${roomId}/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", slug: params.slug }),
      });
      if (!res.ok) {
        const error = await res.json();
        alert(`Ошибка: ${error.error || 'Не удалось начать игру'}`);
      }
    } catch (error) {
      console.error('Error starting quiz:', error);
      alert('Ошибка сети при запуске викторины');
    }
  };

  const handleNext = async () => {
    if (!roomId || isNextQuestionLoading) return;
    
    setIsNextQuestionLoading(true);
    try {
      const res = await fetch(`/api/sessions/${roomId}/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "next" }),
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.finished) {
          alert('Викторина завершена!');
          setSession(prev => prev ? { ...prev, phase: 'idle', currentQuestionID: null } : null);
        }
      } else if (res.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setIsNextQuestionLoading(false);
        handleNext();
        return;
      } else {
        const error = await res.json().catch(() => ({ error: 'Unknown error' }));
        alert(`Ошибка: ${error.error || 'Неизвестная ошибка'}`);
      }
    } catch (error) {
      console.error('Error moving to next question:', error);
      alert('Ошибка сети при переходе к следующему вопросу');
    } finally {
      setTimeout(() => setIsNextQuestionLoading(false), 800);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-pink-50">
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-pink-500 to-blue-500"
            >
              Yoplix
            </Link>
            <Link
              href={`/quiz/${params.slug}`}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              Назад
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6">
          {quiz.title}
        </h1>
        
        {/* Диагностическая информация (только в dev) */}
        {process.env.NODE_ENV === 'development' && (
          <pre className="text-xs opacity-60 bg-gray-100 p-2 rounded mb-4">
            room: {roomId} | players: {Object.keys(session?.players || {}).length} | phase: {session?.phase || 'none'}
          </pre>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* QR код - показываем только до старта */}
          {showQR && (
            <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center">
              <p className="text-gray-700 mb-4 text-center">
                Отсканируйте QR код, чтобы присоединиться со смартфона
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrSrc}
                alt="QR для присоединения"
                width={256}
                height={256}
                className="mx-auto rounded-xl shadow-md"
                onError={(e) => {
                  const el = e.currentTarget as HTMLImageElement;
                  el.src = '/qr-fallback.png';
                }}
              />
              <p className="mt-4 text-sm text-gray-500 break-all text-center">
                Или перейдите по ссылке: <code className="break-all">{joinUrl}</code>
              </p>
            </div>
          )}

          {/* Список игроков */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Игроки</h2>
              <span className="text-lg font-semibold text-gray-600">
                {playersArr.length}
              </span>
            </div>

            {playersArr.length === 0 ? (
              <p className="text-gray-500">Ожидание игроков…</p>
            ) : (
              <ul className="space-y-3">
                {playersArr.map((p) => {
                  const ans = session?.answers[p.playerId];
                  const highlight = ans
                    ? ans.isCorrect
                      ? 'ring-2 ring-green-500'
                      : 'ring-2 ring-red-500'
                    : '';
                  const avgMs = avgCorrectTime(p.totalTimeCorrectMs, p.correctCount);

                  return (
                    <li
                      key={p.playerId}
                      className={`flex items-center gap-3 p-3 rounded-xl bg-gray-50 ${highlight} transition-all`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.avatarUrl || getAvatarUrl(p.nickname || 'Player')}
                        alt={`Avatar ${p.nickname}`}
                        width={40}
                        height={40}
                        loading="lazy"
                        decoding="async"
                        className="w-10 h-10 rounded-full"
                        onError={(e) => {
                          const el = e.currentTarget as HTMLImageElement;
                          el.src = '/avatar-fallback.png';
                        }}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">{p.nickname}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          Очки: <span className="font-semibold">{p.totalPoints}</span> ·{' '}
                          Правильных: <span className="font-semibold">{p.correctCount}</span> ·{' '}
                          Ср.время: <span className="font-semibold">
                            {isNaN(avgMs) ? '—' : fmtSecs(avgMs)}
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Комментарий после ответов всех игроков */}
            {allAnswered && session?.currentQuestion?.comment && (
              <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-gray-700">
                💡 {session.currentQuestion.comment}
              </div>
            )}

            {/* Кнопки управления */}
            <div className="mt-6 flex justify-end gap-3">
              {session?.currentQuestionID && session.phase === 'question' && (
                <button
                  onClick={handleNext}
                  disabled={isNextQuestionLoading}
                  className={`px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold rounded-xl transition-transform shadow-lg ${
                    isNextQuestionLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                  }`}
                >
                  {isNextQuestionLoading ? 'Загрузка...' : 'Следующий вопрос'}
                </button>
              )}
              
              {!session?.currentQuestionID && session?.phase !== 'question' && session?.phase !== 'idle' && (
                <button
                  onClick={handleStart}
                  className="px-8 py-4 bg-gradient-to-r from-yellow-400 via-pink-500 to-blue-500 text-white font-extrabold text-lg rounded-xl shadow-2xl hover:scale-105 transform transition-all"
                >
                  Начать викторину
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Итоги после завершения */}
        {session?.phase === 'idle' && playersArr.length > 0 && (
          <section className="mt-8 bg-white rounded-2xl shadow-xl p-8 space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">🏆 Итоги викторины</h2>
            
            {/* 1. Победители */}
            <div className="text-sm">
              <span className="font-semibold text-gray-800">Победители — </span>
              {topByPoints(playersArr).map((p, i) => (
                <span key={p.playerId} className="inline-flex items-center gap-1 mr-4">
                  <span className="font-medium">
                    {i === 0 ? '🥇 Золото:' : i === 1 ? '🥈 Серебро:' : '🥉 Бронза:'}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.avatarUrl}
                    alt={p.nickname}
                    width={20}
                    height={20}
                    className="rounded-full inline-block"
                  />
                  <span className="font-semibold">{p.nickname}</span>
                  <span className="text-gray-500">({p.totalPoints} очков)</span>
                </span>
              ))}
            </div>

            {/* 2. Самый быстрый */}
            <div className="text-sm">
              <span className="font-semibold text-gray-800">⚡ Самый быстрый — </span>
              {topByAvgTime(playersArr).map((p) => (
                <span key={p.playerId} className="inline-flex items-center gap-1 mr-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.avatarUrl}
                    alt={p.nickname}
                    width={20}
                    height={20}
                    className="rounded-full inline-block"
                  />
                  <span className="font-semibold">{p.nickname}</span>
                  <span className="text-gray-500">
                    ({fmtSecs(p.totalTimeCorrectMs / p.correctCount)})
                  </span>
                </span>
              ))}
            </div>

            {/* 3. Самый результативный */}
            <div className="text-sm">
              <span className="font-semibold text-gray-800">🎯 Самый результативный — </span>
              {topByCorrect(playersArr).map((p) => (
                <span key={p.playerId} className="inline-flex items-center gap-1 mr-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.avatarUrl}
                    alt={p.nickname}
                    width={20}
                    height={20}
                    className="rounded-full inline-block"
                  />
                  <span className="font-semibold">{p.nickname}</span>
                  <span className="text-gray-500">({p.correctCount} правильных)</span>
                </span>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
