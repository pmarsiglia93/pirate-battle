const memory = new Map<string, string>();
export function read<T>(key: string, fallback: T): T {
  let value = memory.get(key);
  try {
    value = localStorage.getItem(`pirate:${key}`) ?? value;
  } catch {
    /* Use the session fallback. */
  }
  try {
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function write<T>(key: string, value: T): void {
  const text = JSON.stringify(value);
  memory.set(key, text);
  try {
    localStorage.setItem(`pirate:${key}`, text);
  } catch {
    /* Session fallback when storage is unavailable. */
  }
}
