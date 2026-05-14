export const LEVEL_TITLES = [
  "Beginner",       // 1
  "Learner",        // 2
  "Apprentice",     // 3
  "Student",        // 4
  "Scholar",        // 5
  "Analyst",        // 6
  "Problem Solver", // 7
  "Tactician",      // 8
  "Expert",         // 9
  "Strategist",     // 10
  "Quant Ninja",    // 11
  "Mastermind",     // 12
  "Prodigy",        // 13
  "Data Master",    // 14
  "Wizard",         // 15
  "Grandmaster",    // 16
  "Champion",       // 17
  "Virtuoso",       // 18
  "Sage",           // 19
  "Legend",         // 20
]

// XP required to reach each level (cumulative)
export const XP_PER_LEVEL = 300

export function getLevel(xp) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1
  return Math.min(level, LEVEL_TITLES.length)
}

export function getLevelTitle(xp) {
  const lvl = getLevel(xp)
  return LEVEL_TITLES[lvl - 1] || "Legend"
}

export function getLevelProgress(xp) {
  const currentLevelXP = ((getLevel(xp) - 1) * XP_PER_LEVEL)
  const progressXP = xp - currentLevelXP
  return { current: progressXP, needed: XP_PER_LEVEL, pct: Math.round((progressXP / XP_PER_LEVEL) * 100) }
}
