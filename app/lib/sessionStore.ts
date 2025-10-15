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

export function addPlayer(roomId: string, player: Player) {
  const current = roomIdToPlayers.get(roomId) ?? [];
  const exists = current.some((p) => p.id === player.id);
  if (!exists) {
    current.push(player);
    roomIdToPlayers.set(roomId, current);
  }
}


