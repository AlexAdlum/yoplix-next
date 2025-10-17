// Простое in-memory хранилище для локальной разработки
// В продакшене будет использоваться Upstash Redis

// In-memory хранилище
const memoryStore = new Map<string, string>();

// Mock Redis интерфейс
const redis = {
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
    const keys = Array.from(memoryStore.keys()).filter((key: string) => 
      pattern.includes('*') ? key.startsWith(pattern.replace('*', '')) : key === pattern
    );
    console.log('Memory Redis: keys', pattern, keys.length);
    return keys;
  },
};

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