import { useCallback } from 'react'
import { BADGE_DEFINITIONS } from '../constants/badges.js'

export function useBadges(store, persist) {
  const badges = store.badges || {}

  const checkBadges = useCallback((context = {}) => {
    const s = { ...store }
    s.badges = { ...s.badges }
    const newBadges = []

    const check = (id, condition) => {
      if (!s.badges[id] && condition) {
        s.badges[id] = { earned: true, earnedAt: Date.now() }
        newBadges.push(BADGE_DEFINITIONS.find(b => b.id === id))
      }
    }

    // Hot Streak
    check("hot_streak", (s.user.streak?.current || 0) >= 7)

    // Sharpshooter - 100% on any quiz
    check("sharpshooter", context.perfectQuiz)

    // Rocket Start - first quiz
    check("rocket_start", (s.history?.length || 0) >= 1 || context.quizCompleted)

    // All-Rounder
    const topicsAttempted = Object.keys(s.progress || {}).filter(t => (s.progress[t].attempted?.length || 0) > 0)
    check("all_rounder", topicsAttempted.length >= 15)

    // Marathon - 100 in a day
    const today = new Date().toISOString().split('T')[0]
    const todayHistory = (s.history || []).filter(h => h.date === today)
    const todayTotal = todayHistory.reduce((sum, h) => sum + (h.totalQ || 0), 0)
    check("marathon", todayTotal >= 100)

    // Early Bird / Night Owl
    const hour = new Date().getHours()
    check("early_bird", hour < 8 && context.quizCompleted)
    check("night_owl", hour >= 22 && context.quizCompleted)

    // Topic mastery checks
    const getTopicAcc = (topicName) => {
      const p = s.progress[topicName]
      if (!p || !p.attempted?.length) return 0
      return Math.round((p.correct.length / p.attempted.length) * 100)
    }
    check("number_wizard", getTopicAcc("Number Systems & Simplification") >= 90)
    check("interest_expert", getTopicAcc("Simple & Compound Interest / Mixtures") >= 90)

    // Centurion - 5 perfect quizzes
    const perfectCount = (s.history || []).filter(h => h.score === h.totalQ).length
    check("centurion", perfectCount >= 5)

    if (newBadges.length > 0) {
      persist(s)
    }

    return newBadges
  }, [store, persist])

  const earnedBadges = BADGE_DEFINITIONS.filter(b => badges[b.id])
  const lockedBadges = BADGE_DEFINITIONS.filter(b => !badges[b.id])

  return { checkBadges, earnedBadges, lockedBadges, allBadges: BADGE_DEFINITIONS, badges }
}
