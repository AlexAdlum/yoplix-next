// lib/sessionKeys.ts
export const keyState   = (roomId: string) => `session:${roomId}:state`;
export const keyPlayers = (roomId: string) => `session:${roomId}:players`;
export const keyEvents  = (roomId: string) => `session:${roomId}:events`;

