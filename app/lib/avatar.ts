export function getAvatarUrl(seed: string) {
  // Держим явный https и кодируем seed
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}


