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
  const [createError, setCreateError] = useState<string | null>(null);
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

  // Create room on mount
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    
    async function createRoom() {
      if (roomId) return; // already have roomId
      
      setIsCreatingRoom(true);
      setCreateError(null);
      console.log('[HOST] Creating session for slug:', params.slug);
      
      try {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: params.slug }),
          signal: controller.signal,
          cache: 'no-store',
        });
        
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          console.error('[HOST] SESSION_CREATE_BAD_STATUS', res.status, text);
          throw new Error(`HTTP ${res.status}`);
        }
        
        const data = await res.json() as { ok: boolean; roomId: string };
        console.log('[HOST] Session created:', data);
        
        if (active && data?.ok && data?.roomId) {
          setRoomId(data.roomId);
        } else if (active) {
          throw new Error('NO_ROOM_ID in response');
        }
      } catch (e: unknown) {
        const error = e as Error;
        console.error('[HOST] SESSION_CREATE_ERROR', error);
        if (active && error.name !== 'AbortError') {
          setCreateError(error?.message ?? 'Create failed');
        }
      } finally {
        if (active) {
          setIsCreatingRoom(false);
        }
      }
    }
    
    createRoom();
    
    return () => {
      active = false;
      controller.abort();
    };
  }, [params.slug, roomId]);

  // Poll players list in lobby (before game starts)
  useEffect(() => {
    if (!roomId) return;
    
    console.log('[HOST] slug=%s roomId=%s phase=%s', params.slug, roomId, session?.phase || 'lobby');
    
    // Stop polling during game (question, reveal, or idle after game)
    if (session?.phase === 'question' || session?.phase === 'reveal' || session?.phase === 'idle' || session?.currentQuestionID) return;
    
    let stopped = false;
    console.log('[HOST] Starting lobby polling for players');
    
    async function fetchPlayers() {
      if (stopped) return;
      
      try {
        const res = await fetch(`/api/sessions/${encodeURIComponent(roomId)}/players`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-store' }
        });
        
        if (res.ok) {
          const data = await res.json();
          const playersList = Array.isArray(data?.players) ? data.players : [];
          console.log('[HOST] players', playersList.length, playersList);
          
          // Always update session, even if players list is empty
          setSession(prev => {
            const newPlayers = playersList.reduce((acc: Record<string, PlayerScore>, p: Record<string, unknown>) => {
              const playerId = (p.id || p.playerId) as string;
              acc[playerId] = {
                playerId,
                nickname: p.nickname as string,
                avatarUrl: p.avatarUrl as string,
                totalPoints: (p.score as number) || 0,
                correctCount: (p.correct as number) || 0,
                totalTimeCorrectMs: (p.totalCorrectTimeMs as number) || 0,
              };
              return acc;
            }, {});
            
            console.log('[HOST] Updating session.players:', Object.keys(newPlayers).length, 'prev exists:', !!prev);
            
            // If no session yet, create minimal session state WITHOUT phase
            // to keep polling active
            if (!prev) {
              return {
                currentQuestionID: null,
                players: newPlayers,
                answers: {},
              } as SessionState;
            }
            
            return {
              ...prev,
              players: newPlayers
            };
          });
        } else {
          console.warn('[HOST] players status', res.status);
        }
      } catch (e) {
        console.warn('[HOST] players fetch err', e);
      } finally {
        if (!stopped) {
          setTimeout(fetchPlayers, 1000);
        }
      }
    }
    
    fetchPlayers();
    
    return () => {
      stopped = true;
      console.log('[HOST] Stopping lobby polling');
    };
  }, [roomId, session?.phase, session?.currentQuestionID, params.slug]);

  // Poll game state
  useEffect(() => {
    if (!roomId) return;

    async function fetchGameState() {
      try {
        const res = await fetch(`/api/sessions/${roomId}/quiz`, {
          cache: "no-store",
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (res.ok) {
          const data = await res.json();
          if (!data.finished) {
            // Обновляем ТОЛЬКО если данные изменились
            setSession(prev => {
              const newPlayers = data.players || {};
              const newAnswers = data.answers || {};
              const newQuestionID = data.currentQuestionID || null;
              const newPhase = data.phase || 'idle';
              
              // Если данных еще нет, создаём начальный state
              if (!prev) {
                console.log('[HOST fetchGameState] Initial state');
                return {
                  phase: newPhase,
                  currentQuestionID: newQuestionID,
                  players: newPlayers,
                  answers: newAnswers,
                  currentQuestion: data.question ? {
                    id: data.currentQuestionID,
                    question: data.question.question || '',
                    promptText: data.promptText,
                    options: data.question.answers || [],
                    comment: data.comment,
                  } : undefined,
                };
              }
              
              // Умная проверка изменений (глубокое сравнение для players и answers)
              const playersKeys = Object.keys(newPlayers);
              const prevPlayersKeys = Object.keys(prev.players || {});
              
              let playersChanged = playersKeys.length !== prevPlayersKeys.length;
              if (!playersChanged) {
                // Сравниваем каждого игрока
                for (const key of playersKeys) {
                  const p1 = newPlayers[key];
                  const p2 = prev.players?.[key];
                  if (!p2 || 
                      p1.totalPoints !== p2.totalPoints || 
                      p1.correctCount !== p2.correctCount || 
                      p1.totalTimeCorrectMs !== p2.totalTimeCorrectMs) {
                    playersChanged = true;
                    break;
                  }
                }
              }
              
              const answersKeys = Object.keys(newAnswers);
              const prevAnswersKeys = Object.keys(prev.answers || {});
              let answersChanged = answersKeys.length !== prevAnswersKeys.length;
              if (!answersChanged) {
                // Сравниваем каждый ответ
                for (const key of answersKeys) {
                  const a1 = newAnswers[key];
                  const a2 = prev.answers?.[key];
                  if (!a2 || a1.isCorrect !== a2.isCorrect || a1.at !== a2.at || a1.option !== a2.option) {
                    answersChanged = true;
                    break;
                  }
                }
              }
              
              const questionChanged = prev.currentQuestionID !== newQuestionID;
              const phaseChanged = prev.phase !== newPhase;
              
              // Если ничего не изменилось - НЕ обновляем state (избегаем перерендера)
              if (!playersChanged && !answersChanged && !questionChanged && !phaseChanged) {
                return prev;
              }
              
              console.log('[HOST fetchGameState] State changed:', { playersChanged, answersChanged, questionChanged, phaseChanged });
              
              // Обновляем только изменённые части
              return {
                ...prev,
                phase: newPhase,
                currentQuestionID: newQuestionID,
                players: playersChanged ? newPlayers : prev.players,
                answers: answersChanged ? newAnswers : prev.answers,
                currentQuestion: questionChanged && data.question ? {
                  id: data.currentQuestionID,
                  question: data.question.question || '',
                  promptText: data.promptText,
                  options: data.question.answers || [],
                  comment: data.comment,
                } : prev.currentQuestion,
              };
            });
          } else {
            // Викторина завершена
            setSession(prev => prev ? { 
              ...prev, 
              phase: 'idle', 
              currentQuestionID: null,
              // Обновляем игроков только если есть данные из API
              ...(data.players && { players: data.players })
            } : null);
          }
        }
      } catch (error) {
        console.error('[HOST] Error fetching game state:', error);
      }
    }
    
    fetchGameState();
    const timer = window.setInterval(fetchGameState, 1000);
    
    return () => window.clearInterval(timer);
  }, [roomId]);

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Викторина не найдена</p>
      </div>
    );
  }

  // Показываем индикатор загрузки пока создаётся комната
  if (!roomId && isCreatingRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Создаём комнату…</p>
        </div>
      </div>
    );
  }

  // Показываем ошибку если не удалось создать комнату
  if (createError && !roomId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <p className="text-red-500 text-lg font-semibold mb-2">Не удалось создать комнату</p>
          <pre className="text-xs opacity-70 bg-gray-100 p-3 rounded mb-4 text-left overflow-auto">
            {createError}
          </pre>
          <button
            className="px-4 py-2 rounded bg-black text-white hover:bg-gray-800 transition-colors"
            onClick={() => {
              window.location.reload();
            }}
          >
            Повторить
          </button>
        </div>
      </div>
    );
  }

  const qrSrc = joinUrl ? `/api/qr?data=${encodeURIComponent(joinUrl)}&size=256` : "";

  const handleStart = async () => {
    if (!roomId) {
      console.warn('[HOST] Start pressed but no roomId yet');
      return;
    }
    
    console.log('[HOST] Starting quiz for room:', roomId);
    
    try {
      const res = await fetch(`/api/sessions/${roomId}/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", slug: params.slug }),
      });
      
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('[HOST] START_BAD_STATUS', res.status, text);
        const error = text ? JSON.parse(text) : {};
        alert(`Ошибка: ${error.error || 'Не удалось начать игру'}`);
      } else {
        console.log('[HOST] Quiz started successfully');
      }
    } catch (error) {
      console.error('[HOST] START_ERROR', error);
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
          setSession(prev => prev ? { ...prev, phase: 'idle', currentQuestionID: null } : null);
        }
      } else if (res.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 500));
        setIsNextQuestionLoading(false);
        handleNext();
        return;
      } else {
        const error = await res.json().catch(() => ({ error: 'Unknown error' }));
        const errorMsg = error.details ? `${error.error}: ${error.details}` : error.error || 'Неизвестная ошибка';
        console.error('[HOST] Next question error:', error);
        alert(`Ошибка: ${errorMsg}`);
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
        {process.env.NODE_ENV === 'development' && roomId && (
          <pre className="text-xs opacity-60 bg-gray-100 p-2 rounded mb-4">
            [HOST] roomId: {roomId} | players: {Object.keys(session?.players || {}).length} | phase: {session?.phase || 'lobby'}
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
              <div>
                <p className="text-gray-500 mb-4">Ожидание игроков…</p>
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-gray-400 bg-gray-50 p-3 rounded">
                    <div>Debug Info:</div>
                    <div>• session?.players: {session?.players ? Object.keys(session.players).length : 'null'}</div>
                    <div>• playersArr.length: {playersArr.length}</div>
                    <div>• Polling active: {session?.phase !== 'question' && session?.phase !== 'idle' ? 'YES' : 'NO'}</div>
                  </div>
                )}
              </div>
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
              {/* Кнопка "Следующий вопрос" - показываем ВСЕГДА когда есть текущий вопрос */}
              {session?.currentQuestionID && (
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
              
              {/* Кнопка "Начать" - только в лобби */}
              {!session?.currentQuestionID && session?.phase !== 'question' && playersArr.length > 0 && (
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
