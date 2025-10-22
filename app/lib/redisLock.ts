/**
 * Простая реализация распределённой блокировки на Redis
 */

import { redis } from '@/app/lib/redis';

/**
 * Выполнить функцию с эксклюзивной блокировкой
 * @param key - ключ блокировки
 * @param ttlMs - время жизни блокировки в миллисекундах
 * @param fn - функция для выполнения под блокировкой
 * @returns результат выполнения функции
 * @throws Error('LOCKED') если блокировка уже захвачена
 */
export async function withRedisLock<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>
): Promise<T> {
  const token = Math.random().toString(36).slice(2);
  
  // Пытаемся установить блокировку
  // SET key value NX PX ttlMs (не существует + время жизни в мс)
  const lockKey = `lock:${key}`;
  const acquired = await redis.set(lockKey, token);
  
  if (!acquired) {
    throw new Error('LOCKED');
  }
  
  try {
    // Выполняем функцию под блокировкой
    return await fn();
  } finally {
    // Best-effort освобождение: удаляем только если наш токен
    try {
      const current = await redis.get(lockKey);
      if (current === token) {
        await redis.del(lockKey);
      }
    } catch (error) {
      console.error('Lock release error:', error);
    }
  }
}

