/**
 * Ключи для Redis сессий
 */

export function keyState(roomId: string): string {
  return `session:${roomId}:state`;
}

export function keyPlayers(roomId: string): string {
  return `session:${roomId}:players`;
}

export function keyEvents(roomId: string): string {
  return `session:${roomId}:events`;
}