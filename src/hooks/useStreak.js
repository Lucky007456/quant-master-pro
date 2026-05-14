import { useCallback, useEffect } from 'react'

export function useStreak(store, persist) {
  const streak = store.user.streak || { current: 0, longest: 0, lastActiveDate: null }

  const checkStreak = useCallback(() => {
    const today = new Date().toISOString().split('T')[0]
    const s = { ...store }
    s.user = { ...s.user, streak: { ...s.user.streak } }
    const st = s.user.streak

    if (st.lastActiveDate === today) return st // already active today

    if (st.lastActiveDate) {
      const last = new Date(st.lastActiveDate)
      const now = new Date(today)
      const diffDays = Math.floor((now - last) / 86400000)

      if (diffDays === 1) {
        st.current += 1
      } else if (diffDays > 1) {
        st.current = 1
      }
    } else {
      st.current = 1
    }

    st.lastActiveDate = today
    st.longest = Math.max(st.longest, st.current)
    persist(s)
    return st
  }, [store, persist])

  const markActive = useCallback(() => {
    return checkStreak()
  }, [checkStreak])

  // Check streak on mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    if (streak.lastActiveDate && streak.lastActiveDate !== today) {
      const last = new Date(streak.lastActiveDate)
      const now = new Date(today)
      const diffDays = Math.floor((now - last) / 86400000)
      if (diffDays > 1) {
        // streak broken but don't reset until they answer
      }
    }
  }, [streak])

  const isActiveToday = streak.lastActiveDate === new Date().toISOString().split('T')[0]

  return { streak, markActive, isActiveToday }
}
