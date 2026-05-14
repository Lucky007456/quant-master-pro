const STORAGE_KEY = 'quantmaster_v2'

export function getFromStorage(key = STORAGE_KEY) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch { /* corrupted */ }

  if (key !== STORAGE_KEY) return null;

  // Migrate from old keys if they exist
  const oldAttempted = JSON.parse(localStorage.getItem('qm_attempted') || '{}')
  const oldCorrect = JSON.parse(localStorage.getItem('qm_correct') || '{}')

  const defaultStore = {
    user: { xp: 0, level: 1, title: "Novice", streak: { current: 0, longest: 0, lastActiveDate: null } },
    progress: {},
    badges: {},
    history: [],
    dailyChallenge: { date: null, completed: false, questionIds: [] },
    activity: [],
  }

  // Migrate old data
  if (Object.keys(oldAttempted).length > 0) {
    const correctIds = Object.keys(oldCorrect).map(Number)
    defaultStore.user.xp = correctIds.length * 10
  }

  return defaultStore
}

export function saveToStorage(key, data) {
  if (typeof data === 'undefined') {
    // Shorthand for saveToStorage(STORAGE_KEY, key)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(key))
  } else {
    localStorage.setItem(key, JSON.stringify(data))
  }
}

export function resetAllData() {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem('qm_attempted')
  localStorage.removeItem('qm_correct')
  localStorage.removeItem('qm_chat')
  localStorage.removeItem('qm_chat_v2')
}
