const STORAGE_KEY = 'quantmaster_v2'

function getStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* corrupted */ }

  // Migrate from old keys if they exist
  const oldAttempted = JSON.parse(localStorage.getItem('qm_attempted') || '{}')
  const oldCorrect = JSON.parse(localStorage.getItem('qm_correct') || '{}')

  const defaultStore = {
    user: { name: "Student", xp: 0, streak: { current: 0, longest: 0, lastActiveDate: null } },
    progress: {},
    badges: {},
    history: [],
    dailyChallenge: { date: null, completed: false, questionIds: [] },
    activity: [],
  }

  // Migrate old data
  if (Object.keys(oldAttempted).length > 0) {
    const attemptedIds = Object.keys(oldAttempted).map(Number)
    const correctIds = Object.keys(oldCorrect).map(Number)
    defaultStore.user.xp = correctIds.length * 10
    // We'll let hooks rebuild topic progress from history
  }

  return defaultStore
}

function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function loadData() {
  return getStore()
}

export function saveData(data) {
  saveStore(data)
}

export function updateData(updater) {
  const store = getStore()
  updater(store)
  saveStore(store)
  return store
}

export function resetAllData() {
  localStorage.removeItem(STORAGE_KEY)
  localStorage.removeItem('qm_attempted')
  localStorage.removeItem('qm_correct')
  localStorage.removeItem('qm_chat')
}
