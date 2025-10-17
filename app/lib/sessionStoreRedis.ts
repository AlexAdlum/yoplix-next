import { RedisStorage } from './redis';

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

export async function createRoom(slug: string): Promise<Room> {
  console.log('sessionStoreRedis - createRoom called with slug:', slug);
  
  const roomId = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  const room: Room = { roomId, slug, createdAt: Date.now() };
  
  console.log('sessionStoreRedis - created room object:', room);
  
  try {
    await RedisStorage.setRoom(roomId, room);
    console.log('sessionStoreRedis - room stored in Redis successfully');
    
    await RedisStorage.setPlayers(roomId, []);
    console.log('sessionStoreRedis - players list initialized');
    
    // Verify the room was stored correctly
    const storedRoom = await RedisStorage.getRoom(roomId);
    console.log('sessionStoreRedis - verification - room retrieved:', storedRoom ? 'YES' : 'NO');
    
    if (storedRoom) {
      console.log('sessionStoreRedis - verification - stored room details:', {
        roomId: storedRoom.roomId,
        slug: storedRoom.slug,
        createdAt: storedRoom.createdAt
      });
    } else {
      console.error('sessionStoreRedis - CRITICAL: Room was not stored correctly!');
      throw new Error('Failed to store room in Redis');
    }
    
    console.log('sessionStoreRedis - room created and stored successfully:', room);
    return room;
  } catch (error) {
    console.error('sessionStoreRedis - error creating room:', error);
    throw error;
  }
}

export async function getRoom(roomId: string): Promise<Room | null> {
  console.log('sessionStoreRedis - getRoom called for roomId:', roomId);
  
  const room = await RedisStorage.getRoom(roomId);
  console.log('sessionStoreRedis - room found:', room ? 'YES' : 'NO');
  
  return room;
}

export async function listPlayers(roomId: string): Promise<Player[]> {
  console.log('sessionStoreRedis - listPlayers called for roomId:', roomId);
  
  const players = await RedisStorage.getPlayers(roomId);
  console.log('sessionStoreRedis - players found:', players.length);
  
  return players;
}

export async function addPlayer(roomId: string, player: Player): Promise<void> {
  console.log('sessionStoreRedis - addPlayer called for roomId:', roomId, 'player:', player);
  
  await RedisStorage.addPlayer(roomId, player);
  
  console.log('sessionStoreRedis - player added successfully');
}

export async function addPlayerAnswer(roomId: string, playerId: string, answer: PlayerAnswer): Promise<void> {
  console.log('sessionStoreRedis - addPlayerAnswer called for roomId:', roomId, 'playerId:', playerId);
  
  await RedisStorage.addPlayerAnswer(roomId, playerId, answer);
  
  console.log('sessionStoreRedis - player answer added successfully');
}

export async function getPlayerScore(roomId: string, playerId: string): Promise<PlayerScore> {
  console.log('sessionStoreRedis - getPlayerScore called for roomId:', roomId, 'playerId:', playerId);
  
  const playerAnswers = await RedisStorage.getPlayerAnswers(roomId, playerId);
  
  const score: PlayerScore = {
    totalPoints: playerAnswers.reduce((sum: number, answer: PlayerAnswer) => sum + answer.points, 0),
    correctAnswers: playerAnswers.filter((answer: PlayerAnswer) => answer.isCorrect).length,
    totalTime: playerAnswers.reduce((sum: number, answer: PlayerAnswer) => sum + answer.responseTime, 0),
  };
  
  console.log('sessionStoreRedis - player score calculated:', score);
  
  return score;
}

// Утилита для отладки - получение всех комнат
export async function getAllRooms(): Promise<Room[]> {
  console.log('sessionStoreRedis - getAllRooms called');
  
  const rooms = await RedisStorage.getAllRooms();
  console.log('sessionStoreRedis - all rooms:', rooms.length);
  
  return rooms;
}
