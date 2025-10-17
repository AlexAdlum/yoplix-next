export type Player = {
  id: string;
  nickname: string;
  avatar: string;
};

export type Room = {
  roomId: string;
  slug: string;
  createdAt: number;
};

// Используем глобальное хранилище для сохранения между запросами
declare global {
  var __roomIdToPlayers: Map<string, Player[]> | undefined;
  var __roomIdToRoom: Map<string, Room> | undefined;
}

const roomIdToPlayers = globalThis.__roomIdToPlayers || new Map<string, Player[]>();
const roomIdToRoom = globalThis.__roomIdToRoom || new Map<string, Room>();

if (!globalThis.__roomIdToPlayers) {
  globalThis.__roomIdToPlayers = roomIdToPlayers;
}
if (!globalThis.__roomIdToRoom) {
  globalThis.__roomIdToRoom = roomIdToRoom;
}

export function createRoom(slug: string): Room {
  const roomId = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  const room: Room = { roomId, slug, createdAt: Date.now() };
  
  console.log('sessionStore - creating room:', room);
  console.log('sessionStore - current rooms count:', roomIdToRoom.size);
  console.log('sessionStore - current players count:', roomIdToPlayers.size);
  
  roomIdToRoom.set(roomId, room);
  roomIdToPlayers.set(roomId, []);
  
  console.log('sessionStore - room stored, total rooms:', roomIdToRoom.size);
  console.log('sessionStore - room stored, total players maps:', roomIdToPlayers.size);
  
  return room;
}

export function getRoom(roomId: string) {
  console.log('sessionStore - getRoom called for roomId:', roomId);
  console.log('sessionStore - total rooms available:', roomIdToRoom.size);
  console.log('sessionStore - room keys:', Array.from(roomIdToRoom.keys()));
  
  const room = roomIdToRoom.get(roomId);
  console.log('sessionStore - room found:', room ? 'YES' : 'NO');
  
  return room;
}

export function listPlayers(roomId: string): Player[] {
  console.log('sessionStore - listPlayers called for roomId:', roomId);
  console.log('sessionStore - total player maps:', roomIdToPlayers.size);
  console.log('sessionStore - player map keys:', Array.from(roomIdToPlayers.keys()));
  
  const players = roomIdToPlayers.get(roomId) ?? [];
  console.log('sessionStore - players found:', players.length);
  
  return players;
}

export type PlayerAnswer = {
  questionId: number;
  answer: string;
  isCorrect: boolean;
  points: number;
  responseTime: number;
};

export type PlayerScore = {
  totalPoints: number;
  correctAnswers: number;
  totalTime: number;
};

// Используем глобальное хранилище для ответов игроков
declare global {
  var __roomIdToAnswers: Map<string, Map<string, PlayerAnswer[]>> | undefined;
}

const roomIdToAnswers = globalThis.__roomIdToAnswers || new Map<string, Map<string, PlayerAnswer[]>>();

if (!globalThis.__roomIdToAnswers) {
  globalThis.__roomIdToAnswers = roomIdToAnswers;
}

export function addPlayer(roomId: string, player: Player) {
  const current = roomIdToPlayers.get(roomId) ?? [];
  const exists = current.some((p) => p.id === player.id);
  if (!exists) {
    current.push(player);
    roomIdToPlayers.set(roomId, current);
  }
}

export function addPlayerAnswer(roomId: string, playerId: string, answer: PlayerAnswer) {
  if (!roomIdToAnswers.has(roomId)) {
    roomIdToAnswers.set(roomId, new Map());
  }
  
  const playerAnswers = roomIdToAnswers.get(roomId)!.get(playerId) ?? [];
  playerAnswers.push(answer);
  roomIdToAnswers.get(roomId)!.set(playerId, playerAnswers);
}

export function getPlayerScore(roomId: string, playerId: string): PlayerScore {
  const playerAnswers = roomIdToAnswers.get(roomId)?.get(playerId) ?? [];
  
  return {
    totalPoints: playerAnswers.reduce((sum, answer) => sum + answer.points, 0),
    correctAnswers: playerAnswers.filter(answer => answer.isCorrect).length,
    totalTime: playerAnswers.reduce((sum, answer) => sum + answer.responseTime, 0),
  };
}


