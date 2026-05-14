const fs = require('fs');
const text = fs.readFileSync('../pdf_full_text.txt', 'utf8');

// Flatten all page markers
const flat = text.replace(/\n--- PAGE \d+ ---\n/g, ' ').replace(/\s+/g, ' ').trim();

// Strategy: Find all question starts "NUMBER." and extract between them
const questions = [];
const starts = [];

// Find all positions where a question number starts
const qStartRegex = /(?:^|\s)(\d{1,3})\.\s+/g;
let m;
while ((m = qStartRegex.exec(flat)) !== null) {
  const num = parseInt(m[1]);
  if (num >= 1 && num <= 750) {
    starts.push({ num, pos: m.index, matchEnd: m.index + m[0].length });
  }
}

// Filter to keep only sequential or near-sequential question numbers
const filtered = [];
for (let i = 0; i < starts.length; i++) {
  const s = starts[i];
  // Accept if it's the first, or if num > previous accepted num
  if (filtered.length === 0) {
    if (s.num === 1) filtered.push(s);
  } else {
    const prev = filtered[filtered.length - 1];
    if (s.num > prev.num && s.num <= prev.num + 5) {
      filtered.push(s);
    } else if (s.num === prev.num + 1) {
      filtered.push(s);
    }
  }
}

// If we missed some, do a second pass with looser matching
if (filtered.length < 700) {
  // Try a different approach: split by question number pattern more aggressively
  filtered.length = 0;
  const seen = new Set();
  for (const s of starts) {
    if (!seen.has(s.num)) {
      // Only take the first occurrence of each number
      if (filtered.length === 0 || s.num > filtered[filtered.length - 1].num) {
        filtered.push(s);
        seen.add(s.num);
      }
    }
  }
}

console.log(`Found ${filtered.length} question positions`);

// Extract text between consecutive question starts
for (let i = 0; i < filtered.length; i++) {
  const start = filtered[i].matchEnd;
  const end = i + 1 < filtered.length ? filtered[i + 1].pos : flat.length;
  const body = flat.substring(start, end).trim();
  
  if (body.length < 15) continue;
  
  // Try multiple option patterns
  let questionText = '';
  let options = [];
  
  // Pattern 1: a. opt  b. opt  c. opt  d. opt (or a) b) c) d))
  const optPatterns = [
    // a. / a) at the end
    /^(.*?)\s+(?:a[\.\)]\s*)(.*?)\s+(?:b[\.\)]\s*)(.*?)\s+(?:c[\.\)]\s*)(.*?)\s+(?:d[\.\)]\s*)(.*?)$/is,
    // A. / A) 
    /^(.*?)\s+(?:A[\.\)]\s*)(.*?)\s+(?:B[\.\)]\s*)(.*?)\s+(?:C[\.\)]\s*)(.*?)\s+(?:D[\.\)]\s*)(.*?)$/is,
    // a) with possible multi-word options
    /^(.*?)\s+a[\.\)]\s+(.*?)\s+b[\.\)]\s+(.*?)\s+c[\.\)]\s+(.*?)\s+d[\.\)]\s+(.*?)$/is,
    // A) B) C) D) pattern
    /^(.*?)\s+A\)\s+(.*?)\s+B\)\s+(.*?)\s+C\)\s+(.*?)\s+D\)\s+(.*?)$/is,
  ];
  
  let matched = false;
  for (const pat of optPatterns) {
    const om = body.match(pat);
    if (om) {
      questionText = om[1].trim();
      options = [om[2].trim(), om[3].trim(), om[4].trim(), om[5].trim()];
      matched = true;
      break;
    }
  }
  
  if (!matched) {
    // Try splitting by a./a)/A./A) more flexibly
    const parts = body.split(/\s+(?:[aA][\.\)])\s+/);
    if (parts.length >= 2) {
      questionText = parts[0].trim();
      const optText = body.substring(body.indexOf(parts[1]) - 3);
      const optSplit = optText.split(/\s+[bBcCdD][\.\)]\s+/);
      if (optSplit.length >= 4) {
        options = optSplit.slice(0, 4).map(o => o.replace(/^[aA][\.\)]\s*/, '').trim());
        matched = true;
      }
    }
  }
  
  if (matched && questionText.length > 10 && options.length === 4) {
    // Clean up options - remove trailing noise
    options = options.map(o => {
      return o
        .replace(/\s*\(\s*\d+\s*[–-]\s*\d+\s*\).*$/i, '')  // (701 – 705) Direction:...
        .replace(/\s*Direction:.*$/i, '')                      // Direction: ...
        .replace(/\s+\d+\.\s*$/, '')                           // trailing "123."
        .replace(/\s*\(\s*\d+\s*[-–]\s*\d+\s*$/, '')          // unclosed (701 – 705
        .trim();
    });
    
    questions.push({
      id: filtered[i].num,
      question: questionText,
      options: options
    });
  }
}

// Assign topics based on question ranges
const topicRanges = [
  [1, 20, "Number Systems & Simplification"],
  [21, 50, "Percentages"],
  [51, 70, "Profit, Loss & Discount"],
  [71, 80, "Partnership"],
  [81, 125, "Ratio & Proportion"],
  [126, 185, "Time & Work"],
  [186, 245, "Speed, Distance & Time"],
  [246, 305, "Clocks & Calendar"],
  [306, 365, "Permutations & Combinations"],
  [366, 425, "Probability & Statistics"],
  [426, 485, "Problems on Ages"],
  [486, 575, "Data Interpretation & Averages"],
  [576, 665, "Simple & Compound Interest / Mixtures"],
  [666, 695, "Logical Reasoning (Syllogisms)"],
  [696, 750, "Data Interpretation Advanced"]
];

for (const q of questions) {
  q.topic = "General Aptitude";
  for (const [start, end, topic] of topicRanges) {
    if (q.id >= start && q.id <= end) {
      q.topic = topic;
      break;
    }
  }
}

// Log stats
const topicCounts = {};
for (const q of questions) {
  topicCounts[q.topic] = (topicCounts[q.topic] || 0) + 1;
}
console.log(`\nTotal parsed: ${questions.length} questions`);
console.log('\nTopic breakdown:');
for (const [t, c] of Object.entries(topicCounts)) {
  console.log(`  ${t}: ${c}`);
}

// Show some sample questions
console.log('\nSample Q1:', JSON.stringify(questions[0], null, 2));
console.log('\nSample Q100:', JSON.stringify(questions.find(q => q.id === 100), null, 2));
console.log('\nSample Q500:', JSON.stringify(questions.find(q => q.id === 500), null, 2));
console.log('\nSample Q700:', JSON.stringify(questions.find(q => q.id === 700), null, 2));

// Check for gaps
const ids = new Set(questions.map(q => q.id));
const missing = [];
for (let i = 1; i <= 750; i++) {
  if (!ids.has(i)) missing.push(i);
}
console.log(`\nMissing question IDs (${missing.length}):`, missing.slice(0, 30).join(', '), missing.length > 30 ? '...' : '');

fs.writeFileSync('src/data/questions.json', JSON.stringify(questions, null, 2));
console.log('\nSaved to src/data/questions.json');
