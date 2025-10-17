import { kv } from '@vercel/kv';

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
    return `game:${roomId}`;
  }
  
  private static getAnswersKey(roomId: string) {
    return `answers:${roomId}`;
  }

  // Работа с комнатами
  static async setRoom(roomId: string, room: Record<string, unknown>) {
    const key = this.getRoomKey(roomId);
    await kv.set(key, JSON.stringify(room));
    console.log('Redis - room stored:', roomId);
  }
  
  static async getRoom(roomId: string) {
    const key = this.getRoomKey(roomId);
    const data = await kv.get(key);
    if (!data) return null;
    return JSON.parse(data as string);
  }
  
  static async deleteRoom(roomId: string) {
    const key = this.getRoomKey(roomId);
    await kv.del(key);
    console.log('Redis - room deleted:', roomId);
  }

  // Работа с игроками
  static async setPlayers(roomId: string, players: Record<string, unknown>[]) {
    const key = this.getPlayersKey(roomId);
    await kv.set(key, JSON.stringify(players));
    console.log('Redis - players stored:', roomId, players.length);
  }
  
  static async getPlayers(roomId: string) {
    const key = this.getPlayersKey(roomId);
    const data = await kv.get(key);
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
    await kv.set(key, JSON.stringify(session));
    console.log('Redis - game session stored:', roomId);
  }
  
  static async getGameSession(roomId: string) {
    const key = this.getGameSessionKey(roomId);
    const data = await kv.get(key);
    if (!data) return null;
    return JSON.parse(data as string);
  }
  
  static async deleteGameSession(roomId: string) {
    const key = this.getGameSessionKey(roomId);
    await kv.del(key);
    console.log('Redis - game session deleted:', roomId);
  }

  // Работа с ответами игроков
  static async setPlayerAnswers(roomId: string, playerId: string, answers: Record<string, unknown>[]) {
    const key = `${this.getAnswersKey(roomId)}:${playerId}`;
    await kv.set(key, JSON.stringify(answers));
    console.log('Redis - player answers stored:', roomId, playerId, answers.length);
  }
  
  static async getPlayerAnswers(roomId: string, playerId: string) {
    const key = `${this.getAnswersKey(roomId)}:${playerId}`;
    const data = await kv.get(key);
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
    const keys = await kv.keys('room:*');
    const rooms = [];
    for (const key of keys) {
      const data = await kv.get(key);
      if (data) {
        rooms.push(JSON.parse(data as string));
      }
    }
    return rooms;
  }
}
