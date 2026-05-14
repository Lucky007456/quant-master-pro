export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function pickRandom(arr, count) {
  return shuffle(arr).slice(0, count)
}

export function filterByTopic(questions, topic) {
  if (!topic) return questions
  return questions.filter(q => q.topic === topic)
}

export function getWeakTopics(questions, progress, count = 3) {
  const topicStats = {}
  for (const q of questions) {
    if (!topicStats[q.topic]) topicStats[q.topic] = { attempted: 0, correct: 0 }
    const p = progress[q.topic]
    if (p) {
      topicStats[q.topic].attempted = p.attempted?.length || 0
      topicStats[q.topic].correct = p.correct?.length || 0
    }
  }

  return Object.entries(topicStats)
    .filter(([, s]) => s.attempted >= 3) // need min data
    .map(([topic, s]) => ({
      topic,
      accuracy: s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : 0
    }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, count)
}

export function getDailyQuestions(questions, count = 5) {
  // Seed by date for consistent daily challenge
  const today = new Date().toISOString().split('T')[0]
  let seed = 0
  for (const c of today) seed = ((seed << 5) - seed + c.charCodeAt(0)) | 0

  const seededRandom = (max) => {
    seed = (seed * 16807 + 0) % 2147483647
    return Math.abs(seed) % max
  }

  const pool = [...questions]
  const picked = []
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = seededRandom(pool.length)
    picked.push(pool.splice(idx, 1)[0])
  }
  return picked
}
