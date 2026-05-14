import { useCallback, useRef } from 'react'
import { getLevel } from '../constants/levels.js'

export function useXP(store, persist) {
  const prevLevel = useRef(getLevel(store.user.xp))

  const awardXP = useCallback((amount, reason) => {
    const s = { ...store }
    s.user = { ...s.user, xp: s.user.xp + amount }

    // Add activity
    s.activity = [
      { type: 'xp', text: `+${amount} XP — ${reason}`, time: Date.now() },
      ...(s.activity || []).slice(0, 49)
    ]

    const newLevel = getLevel(s.user.xp)
    const leveledUp = newLevel > prevLevel.current
    prevLevel.current = newLevel

    persist(s)
    return { newXP: s.user.xp, leveledUp, newLevel }
  }, [store, persist])

  const XP_REWARDS = {
    correct_answer: 10,
    perfect_quiz: 50,
    streak_bonus: 20,
    new_topic: 15,
    daily_challenge: 25,
  }

  return { awardXP, XP_REWARDS, xp: store.user.xp }
}
