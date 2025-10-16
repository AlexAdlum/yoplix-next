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

const roomIdToPlayers: Map<string, Player[]> = new Map();
const roomIdToRoom: Map<string, Room> = new Map();

export function createRoom(slug: string): Room {
  const roomId = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  const room: Room = { roomId, slug, createdAt: Date.now() };
  roomIdToRoom.set(roomId, room);
  roomIdToPlayers.set(roomId, []);
  return room;
}

export function getRoom(roomId: string) {
  return roomIdToRoom.get(roomId);
}

export function listPlayers(roomId: string): Player[] {
  return roomIdToPlayers.get(roomId) ?? [];
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

const roomIdToAnswers: Map<string, Map<string, PlayerAnswer[]>> = new Map();

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


