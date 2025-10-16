"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getQuizBySlug } from "@/app/data/quizzes";

interface HostPageProps {
  params: { slug: string };
}

type Player = {
  id: string;
  nickname: string;
  avatar: string;
};

export default function HostPage({ params }: HostPageProps) {
  const quiz = getQuizBySlug(params.slug);
  const [players, setPlayers] = useState<Player[]>([]);
  const [started, setStarted] = useState(false);
  const [roomId, setRoomId] = useState<string>("");
  const joinUrl = useMemo(() => {
    if (typeof window === "undefined" || !roomId) return "";
    const base = window.location.origin;
    const url = new URL(`${base}/join/${params.slug}`);
    url.searchParams.set("room", roomId);
    return url.toString();
  }, [params.slug, roomId]);

  useEffect(() => {
    // Ensure room exists (create once per host screen open)
    async function ensureRoom() {
      if (roomId) return;
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
      } catch {}
    }
    ensureRoom();

    async function fetchPlayers() {
      if (!roomId) return;
      try {
        const res = await fetch(`/api/sessions/${roomId}/players`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = (await res.json()) as { players: Player[] };
          setPlayers(data.players);
        }
      } catch (error) {
        console.error('Error fetching players:', error);
      }
    }
    fetchPlayers();
    const timer = window.setInterval(fetchPlayers, 1500);
    return () => {
      window.clearInterval(timer);
    };
  }, [params.slug, roomId]);

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Викторина не найдена</p>
      </div>
    );
  }

  const qrSrc = joinUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(joinUrl)}`
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
            <img
              alt="QR для присоединения"
              src={qrSrc}
              className="w-64 h-64 sm:w-72 sm:h-72 rounded-xl shadow-md"
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
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {players.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                    <img src={p.avatar} alt={p.nickname} className="w-10 h-10 rounded-full" />
                    <span className="font-medium text-gray-800">{p.nickname}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={async () => {
                  if (!roomId) return;
                  try {
                    const res = await fetch(`/api/sessions/${roomId}/quiz`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "start", slug: params.slug }),
                    });
                    if (res.ok) {
                      setStarted(true);
                      // Уведомляем игроков о начале викторины
                      const channel = new BroadcastChannel(`yoplix-game-${roomId}`);
                      channel.postMessage({ type: "quiz:started" });
                      channel.close();
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


