export const TOPIC_META = {
  "Number Systems & Simplification": { emoji: "🔢", color: "#F59E0B" },
  "Percentages": { emoji: "📊", color: "#22D3EE" },
  "Profit, Loss & Discount": { emoji: "💹", color: "#10B981" },
  "Partnership": { emoji: "🤝", color: "#A78BFA" },
  "Ratio & Proportion": { emoji: "⚖️", color: "#FB923C" },
  "Time & Work": { emoji: "⏱️", color: "#F43F5E" },
  "Speed, Distance & Time": { emoji: "🚀", color: "#3B82F6" },
  "Clocks & Calendar": { emoji: "🕐", color: "#EC4899" },
  "Permutations & Combinations": { emoji: "🎲", color: "#8B5CF6" },
  "Probability & Statistics": { emoji: "📈", color: "#14B8A6" },
  "Problems on Ages": { emoji: "👥", color: "#F97316" },
  "Data Interpretation & Averages": { emoji: "📋", color: "#06B6D4" },
  "Simple & Compound Interest / Mixtures": { emoji: "💰", color: "#EAB308" },
  "Logical Reasoning (Syllogisms)": { emoji: "🧠", color: "#D946EF" },
  "Data Interpretation Advanced": { emoji: "🔍", color: "#0EA5E9" },
}

export const getTopicMeta = (name) => TOPIC_META[name] || { emoji: "📝", color: "#94A3B8" }
