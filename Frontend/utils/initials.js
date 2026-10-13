export function initialsFromName(name, fallback = 'CS') {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return fallback
  return parts.map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}
