"use client";
import Link from "next/link";
import Image from "next/image";
import { getAvatarUrl } from "@/app/lib/avatar";
import { useEffect, useMemo, useState } from "react";
import { getQuizBySlug } from "@/app/data/quizzes";

interface HostPageProps {
  params: { slug: string };
}

type Player = {
  id: string;
  nickname: string;
  avatarUrl: string;  // Full URL chosen by player
  joinedAt: number;
};

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

export default function HostPage({ params }: HostPageProps) {
  const quiz = getQuizBySlug(params.slug);
  const [players, setPlayers] = useState<Player[]>([]);
  const [started, setStarted] = useState(false);
  const [roomId, setRoomId] = useState<string>("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [playerScores, setPlayerScores] = useState<Record<string, PlayerScore>>({});
  const [playerAnswers, setPlayerAnswers] = useState<Record<string, PlayerAnswer>>({});
  const [currentComment, setCurrentComment] = useState<string>("");
  const [allAnswered, setAllAnswered] = useState(false);
  
  const joinUrl = useMemo(() => {
    if (typeof window === "undefined" || !roomId) return "";
    
    // Используем переменную окружения для базового URL
    const base = process.env.NEXT_PUBLIC_BASE_URL || 
      (process.env.NODE_ENV === 'production' ? 'https://yoplix.ru' : window.location.origin);
    
    const url = new URL(`${base}/join/${params.slug}`);
    url.searchParams.set("room", roomId);
    const finalUrl = url.toString();
    console.log('joinUrl generated:', finalUrl);
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Base URL:', base);
    return finalUrl;
  }, [params.slug, roomId]);

  useEffect(() => {
    // Ensure room exists (create once per host screen open)
    async function ensureRoom() {
      console.log('ensureRoom called - roomId:', roomId, 'isCreatingRoom:', isCreatingRoom);
      if (roomId || isCreatingRoom) {
        console.log('ensureRoom - skipping, room already exists or is being created');
        return;
      }
      
      setIsCreatingRoom(true);
      console.log('Attempting to create room for slug:', params.slug);
      
      try {
        const res = await fetch(`/api/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: params.slug }),
        });
        console.log('Room creation response status:', res.status);
        
        if (res.ok) {
          const data = (await res.json()) as { roomId: string };
          console.log('Room created successfully:', data.roomId);
          console.log('Setting roomId state to:', data.roomId);
          setRoomId(data.roomId);
          console.log('RoomId state set, joinUrl will be:', `${process.env.NEXT_PUBLIC_BASE_URL || 'https://yoplix.ru'}/join/${params.slug}?room=${data.roomId}`);
        } else {
          const error = await res.json();
          console.error('Failed to create room:', error);
        }
      } catch (error) {
        console.error('Error creating room:', error);
      } finally {
        setIsCreatingRoom(false);
      }
    }
    ensureRoom();

    async function fetchPlayers() {
      if (!roomId) return;
      try {
        console.log('Fetching players for roomId:', roomId);
        const res = await fetch(`/api/sessions/${roomId}/players`, {
          cache: "no-store",
          headers: {
            'Cache-Control': 'no-cache',
          }
        });
        
        console.log('Fetch players response status:', res.status);
        
        if (res.ok) {
          const data = (await res.json()) as { players: Player[] };
          console.log('Players fetched:', data.players.length);
          setPlayers(data.players);
        } else {
          console.error('Failed to fetch players, status:', res.status);
          const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Fetch players error:', errorData);
        }
      } catch (error) {
        console.error('Error fetching players:', error);
        // Не очищаем список игроков при ошибке сети
      }
    }
    
    async function fetchGameState() {
      if (!roomId || !started) return;
      try {
        const res = await fetch(`/api/sessions/${roomId}/quiz`, {
          cache: "no-store",
          headers: {
            'Cache-Control': 'no-cache',
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          if (!data.finished) {
            setPlayerScores(data.players || {});
            setPlayerAnswers(data.answers || {});
            setCurrentComment(data.comment || "");
            
            // Проверяем, все ли игроки ответили
            const activePlayerIds = players.map(p => p.id);
            const answeredPlayerIds = Object.keys(data.answers || {});
            const allPlayersAnswered = activePlayerIds.every(id => answeredPlayerIds.includes(id));
            setAllAnswered(allPlayersAnswered);
          }
        }
      } catch (error) {
        console.error('Error fetching game state:', error);
      }
    }
    
    fetchPlayers();
    fetchGameState();
    
    const playersTimer = window.setInterval(fetchPlayers, 1500);
    const gameStateTimer = window.setInterval(fetchGameState, 1000);
    
    return () => {
      window.clearInterval(playersTimer);
      window.clearInterval(gameStateTimer);
    };
  }, [params.slug, roomId, isCreatingRoom, started, players]);

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Викторина не найдена</p>
      </div>
    );
  }

  const qrSrc = joinUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(joinUrl)}&timestamp=${Date.now()}`
    : "";

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center">
            <p className="text-gray-700 mb-4 text-center">
              Отсканируйте QR код, чтобы присоединиться со смартфона
            </p>
            <Image
              alt="QR для присоединения"
              src={qrSrc}
              width={256}
              height={256}
              className="mx-auto rounded-xl shadow-md"
              priority
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/qr-fallback.png';
              }}
            />
            <p className="mt-4 text-sm text-gray-500 break-all text-center">
              Или перейдите по ссылке: <span className="font-mono">{joinUrl}</span>
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Игроки</h2>
              <span className="text-sm text-gray-500">{players.length} присоединилось</span>
            </div>

            {started && (
              <div className="mb-4 rounded-lg bg-green-50 border border-green-200 text-green-700 px-4 py-3">
                Игра запущена! Игроки получили сигнал старта.
              </div>
            )}

            {players.length === 0 ? (
              <p className="text-gray-500">Ожидание игроков…</p>
            ) : (
              <ul className="grid grid-cols-1 gap-3">
                {players.map((p) => {
                  const answer = playerAnswers[p.id];
                  const score = playerScores[p.id];
                  const bgColor = answer 
                    ? answer.isCorrect 
                      ? 'bg-green-50 border-green-300' 
                      : 'bg-red-50 border-red-300'
                    : 'bg-gray-50 border-gray-200';
                  
                  return (
                    <li key={p.id} className={`flex items-center gap-3 p-3 rounded-lg border-2 ${bgColor} transition-colors`}>
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
                        <span className="font-medium text-gray-800 block">{p.nickname}</span>
                        {started && score && (
                          <div className="text-xs text-gray-600 mt-1 flex gap-3">
                            <span>💰 {score.totalPoints} баллов</span>
                            <span>✅ {score.correctCount} правильных</span>
                            <span>⏱️ {(score.totalTimeCorrectMs / 1000).toFixed(1)}с</span>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            
            {allAnswered && currentComment && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>💡 Комментарий:</strong> {currentComment}
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              {started && (
                <button
                  onClick={async () => {
                    if (!roomId) return;
                    try {
                      console.log('Moving to next question...');
                      const res = await fetch(`/api/sessions/${roomId}/quiz`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "next" }),
                      });
                      if (res.ok) {
                        const data = await res.json();
                        if (data.finished) {
                          console.log('Quiz finished!');
                          alert('Викторина завершена!');
                          setStarted(false);
                        } else {
                          console.log('Next question loaded');
                          // Сбрасываем подсветки ответов
                          setPlayerAnswers({});
                          setCurrentComment("");
                          setAllAnswered(false);
                        }
                      } else {
                        const error = await res.json();
                        console.error('Next question error:', error);
                        alert(`Ошибка перехода к следующему вопросу: ${error.error || 'Неизвестная ошибка'}`);
                      }
                    } catch (error) {
                      console.error('Network error:', error);
                      alert('Ошибка сети при переходе к следующему вопросу');
                    }
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold rounded-xl transition-transform shadow-lg hover:scale-105"
                >
                  Следующий вопрос
                </button>
              )}
              
              <button
                onClick={async () => {
                  if (!roomId) {
                    console.error('No roomId available');
                    return;
                  }
                  console.log('Starting quiz for roomId:', roomId, 'slug:', params.slug);
                  try {
                    const res = await fetch(`/api/sessions/${roomId}/quiz`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "start", slug: params.slug }),
                    });
                    console.log('Quiz start response status:', res.status);
                    if (res.ok) {
                      setStarted(true);
                      console.log('Quiz started successfully');
                      // Игроки будут проверять статус игры через polling
                    } else {
                      const error = await res.json();
                      console.error('Quiz start error:', error);
                      alert(`Ошибка запуска викторины: ${error.error || 'Неизвестная ошибка'}`);
                    }
                  } catch (error) {
                    console.error('Network error:', error);
                    alert('Ошибка сети при запуске викторины');
                  }
                }}
                className={`px-6 py-3 text-white font-bold rounded-xl transition-transform shadow-lg ${
                  players.length === 0
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-gradient-to-r from-yellow-400 to-pink-500 hover:scale-105"
                }`}
                disabled={players.length === 0 || started}
              >
                {started ? "Идёт игра" : "Начать викторину"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


