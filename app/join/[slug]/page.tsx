"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

  const channelName = useMemo(() => `yoplix-join-${params.slug}`, [params.slug]);

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

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Викторина не найдена</p>
      </div>
    );
  }

  function handleReady() {
    if (!nickname.trim()) return;
    const player = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      nickname: nickname.trim(),
      avatar,
    };
    const channel = new BroadcastChannel(channelName);
    channel.postMessage({ type: "player:join", payload: player });
    channel.close();
    setJoined(true);
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
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            {!started ? (
              <>
                <h2 className="text-2xl font-bold mb-2">Ожидание старта…</h2>
                <p className="text-gray-600">Ожидайте ведущего. Игра скоро начнется.</p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold mb-2">Игра началась!</h2>
                <p className="text-gray-600">Скоро появится первый вопрос…</p>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}


