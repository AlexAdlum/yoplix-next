// Гибридное хранилище: Upstash Redis для продакшена, in-memory для разработки
import { Redis } from '@upstash/redis';

// Проверяем, работаем ли мы в продакшене с Upstash Redis
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
const hasUpstashConfig = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

let redis: {
  set: (key: string, value: string) => Promise<string | null>;
  get: (key: string) => Promise<string | null>;
  del: (key: string) => Promise<number>;
  keys: (pattern: string) => Promise<string[]>;
};

if (isProduction && hasUpstashConfig) {
  // Используем Upstash Redis в продакшене
  console.log('Using Upstash Redis for production');
  console.log('Redis config check:', {
    isProduction,
    hasUpstashConfig,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    hasUrl: !!process.env.UPSTASH_REDIS_REST_URL,
    hasToken: !!process.env.UPSTASH_REDIS_REST_TOKEN
  });
  const upstashRedis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  
  redis = {
    set: async (key: string, value: string) => {
      const result = await upstashRedis.set(key, value);
      console.log('Upstash Redis: set', key, result);
      return result;
    },
    get: async (key: string) => {
      const result = await upstashRedis.get(key);
      console.log('Upstash Redis: get', key, result ? 'found' : 'not found');
      return result as string | null;
    },
    del: async (key: string) => {
      const result = await upstashRedis.del(key);
      console.log('Upstash Redis: del', key, result);
      return result;
    },
    keys: async (pattern: string) => {
      const result = await upstashRedis.keys(pattern);
      console.log('Upstash Redis: keys', pattern, result.length);
      return result;
    },
  };
} else {
  // Используем in-memory хранилище для разработки
  console.log('Using in-memory storage for development');
  
  // Используем глобальное хранилище для сохранения между запросами
  const memoryStore = (globalThis as Record<string, unknown>).__yoplixMemoryStore as Map<string, string> || new Map<string, string>();
  if (!(globalThis as Record<string, unknown>).__yoplixMemoryStore) {
    (globalThis as Record<string, unknown>).__yoplixMemoryStore = memoryStore;
  }
  
  redis = {
    set: async (key: string, value: string) => {
      memoryStore.set(key, value);
      console.log('Memory Redis: set', key);
      return 'OK';
    },
    get: async (key: string) => {
      const value = memoryStore.get(key);
      console.log('Memory Redis: get', key, value ? 'found' : 'not found');
      return value || null;
    },
    del: async (key: string) => {
      const existed = memoryStore.has(key);
      memoryStore.delete(key);
      console.log('Memory Redis: del', key);
      return existed ? 1 : 0;
    },
    keys: async (pattern: string) => {
      const keys = Array.from(memoryStore.keys()).filter((key) => 
        pattern.includes('*') ? (key as string).startsWith(pattern.replace('*', '')) : (key as string) === pattern
      ) as string[];
      console.log('Memory Redis: keys', pattern, keys.length);
      return keys;
    },
  };
}


// Утилиты для работы с Redis
export class RedisStorage {
  // Ключи для разных типов данных
  private static getRoomKey(roomId: string) {
    return `room:${roomId}`;
  }
  
  private static getPlayersKey(roomId: string) {
    return `players:${roomId}`;
  }
  
  private static getGameSessionKey(roomId: string) {
    return `gameSession:${roomId}`;
  }
  
  private static getAnswersKey(roomId: string) {
    return `answers:${roomId}`;
  }

  // Работа с комнатами
  static async setRoom(roomId: string, room: Record<string, unknown>) {
    const key = this.getRoomKey(roomId);
    await redis.set(key, JSON.stringify(room));
    console.log('Redis - room stored:', roomId);
  }
  
  static async getRoom(roomId: string) {
    const key = this.getRoomKey(roomId);
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data as string);
  }
  
  static async deleteRoom(roomId: string) {
    const key = this.getRoomKey(roomId);
    await redis.del(key);
    console.log('Redis - room deleted:', roomId);
  }

  // Работа с игроками
  static async setPlayers(roomId: string, players: Record<string, unknown>[]) {
    const key = this.getPlayersKey(roomId);
    await redis.set(key, JSON.stringify(players));
    console.log('Redis - players stored:', roomId, players.length);
  }
  
  static async getPlayers(roomId: string) {
    const key = this.getPlayersKey(roomId);
    const data = await redis.get(key);
    if (!data) return [];
    return JSON.parse(data as string);
  }
  
  static async addPlayer(roomId: string, player: Record<string, unknown>) {
    const players = await this.getPlayers(roomId);
    const exists = players.some((p: Record<string, unknown>) => p.id === player.id);
    if (!exists) {
      players.push(player);
      await this.setPlayers(roomId, players);
      console.log('Redis - player added:', roomId, player.id);
    }
    return players;
  }

  // Работа с игровыми сессиями
  static async setGameSession(roomId: string, session: Record<string, unknown>) {
    const key = this.getGameSessionKey(roomId);
    console.log('Redis - setGameSession - key:', key);
    console.log('Redis - setGameSession - session data:', {
      isActive: session.isActive,
      isGameStarted: session.isGameStarted,
      questionsCount: Array.isArray(session.questions) ? session.questions.length : 0
    });
    await redis.set(key, JSON.stringify(session));
    console.log('Redis - game session stored:', roomId);
  }
  
  static async getGameSession(roomId: string) {
    const key = this.getGameSessionKey(roomId);
    console.log('Redis - getGameSession - key:', key);
    const data = await redis.get(key);
    console.log('Redis - getGameSession - data found:', data ? 'YES' : 'NO');
    if (!data) return null;
    const parsed = JSON.parse(data as string);
    console.log('Redis - getGameSession - parsed session:', {
      isActive: parsed.isActive,
      isGameStarted: parsed.isGameStarted,
      questionsCount: Array.isArray(parsed.questions) ? parsed.questions.length : 0
    });
    return parsed;
  }
  
  static async deleteGameSession(roomId: string) {
    const key = this.getGameSessionKey(roomId);
    await redis.del(key);
    console.log('Redis - game session deleted:', roomId);
  }

  // Работа с ответами игроков
  static async setPlayerAnswers(roomId: string, playerId: string, answers: Record<string, unknown>[]) {
    const key = `${this.getAnswersKey(roomId)}:${playerId}`;
    await redis.set(key, JSON.stringify(answers));
    console.log('Redis - player answers stored:', roomId, playerId, answers.length);
  }
  
  static async getPlayerAnswers(roomId: string, playerId: string) {
    const key = `${this.getAnswersKey(roomId)}:${playerId}`;
    const data = await redis.get(key);
    if (!data) return [];
    return JSON.parse(data as string);
  }
  
  static async addPlayerAnswer(roomId: string, playerId: string, answer: Record<string, unknown>) {
    const answers = await this.getPlayerAnswers(roomId, playerId);
    answers.push(answer);
    await this.setPlayerAnswers(roomId, playerId, answers);
    console.log('Redis - player answer added:', roomId, playerId);
    return answers;
  }

  // Получение всех комнат (для отладки)
  static async getAllRooms() {
    const keys = await redis.keys('room:*');
    const rooms = [];
    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        rooms.push(JSON.parse(data as string));
      }
    }
    return rooms;
  }
}