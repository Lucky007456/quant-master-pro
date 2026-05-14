const fs = require('fs');
const text = fs.readFileSync('../pdf_full_text.txt', 'utf8');

// ============================================================
// STEP 1: Parse the answer key from pages 89-92
// ============================================================
const answerKey = {};

// The answer key is in format: "1   d   51   d   101   b ..." across columns
const answerKeySection = text.substring(text.indexOf('ANSWER KEY'));
// Match patterns like "123   a" or "123   c"
const akRegex = /(\d{1,3})\s+([a-dA-D])\b/g;
let akMatch;
while ((akMatch = akRegex.exec(answerKeySection)) !== null) {
  const qNum = parseInt(akMatch[1]);
  const ans = akMatch[2].toLowerCase();
  if (qNum >= 1 && qNum <= 750) {
    answerKey[qNum] = ans;
  }
}
console.log(`Parsed ${Object.keys(answerKey).length} answers from answer key`);

// ============================================================
// STEP 2: Parse questions from the main text (pages 1-88)
// ============================================================

// Get only the question pages (before answer key)
const questionText = text.substring(0, text.indexOf('ANSWER KEY'));

// Remove page markers and normalize whitespace per page
const pages = questionText.split(/--- PAGE \d+ ---/).filter(p => p.trim());

// Combine all text, preserving some structure
let allText = pages.join(' ').replace(/\s+/g, ' ').trim();

// Strategy: Find each question by its number followed by a period
// Questions follow the pattern: NUMBER. question text a. opt b. opt c. opt d. opt
const questions = [];

// Build a list of all question start positions
// We need to find "N." where N is 1-750 at word boundary
const questionStarts = [];
const qStartPattern = /(?:^|\s)(\d{1,3})\.\s/g;
let qm;
while ((qm = qStartPattern.exec(allText)) !== null) {
  const num = parseInt(qm[1]);
  if (num >= 1 && num <= 750) {
    questionStarts.push({
      num,
      pos: qm.index,
      textStart: qm.index + qm[0].length
    });
  }
}

// Filter to keep only sequential question numbers (first occurrence of each)
const seenNums = new Set();
const filteredStarts = [];
let lastAccepted = 0;

for (const qs of questionStarts) {
  if (seenNums.has(qs.num)) continue;
  
  // Accept if it's reasonably sequential
  if (filteredStarts.length === 0) {
    if (qs.num === 1) {
      filteredStarts.push(qs);
      seenNums.add(qs.num);
      lastAccepted = qs.num;
    }
  } else {
    // Accept if num > last accepted and within reasonable range
    if (qs.num > lastAccepted && qs.num <= lastAccepted + 10) {
      filteredStarts.push(qs);
      seenNums.add(qs.num);
      lastAccepted = qs.num;
    }
  }
}

console.log(`Found ${filteredStarts.length} question positions`);

// Extract each question's body text (between consecutive question starts)
for (let i = 0; i < filteredStarts.length; i++) {
  const start = filteredStarts[i].textStart;
  const end = i + 1 < filteredStarts.length ? filteredStarts[i + 1].pos : allText.length;
  const body = allText.substring(start, end).trim();
  const qNum = filteredStarts[i].num;
  
  if (body.length < 10) continue;
  
  // Try to extract question text and options using multiple patterns
  let questionText = '';
  let options = [];
  let matched = false;
  
  // Pattern group 1: "a) opt b) opt c) opt d) opt" or "a. opt b. opt c. opt d. opt"
  // Handle both lowercase and uppercase, both . and )
  const optionPatterns = [
    // a) ... b) ... c) ... d) ...  (most common)
    /^([\s\S]*?)\s+(?:a[\.\)])\s*([\s\S]*?)\s+(?:b[\.\)])\s*([\s\S]*?)\s+(?:c[\.\)])\s*([\s\S]*?)\s+(?:d[\.\)])\s*([\s\S]*?)$/i,
    // A) ... B) ... C) ... D) ... 
    /^([\s\S]*?)\s+(?:A[\.\)])\s*([\s\S]*?)\s+(?:B[\.\)])\s*([\s\S]*?)\s+(?:C[\.\)])\s*([\s\S]*?)\s+(?:D[\.\)])\s*([\s\S]*?)$/,
  ];
  
  for (const pat of optionPatterns) {
    const m = body.match(pat);
    if (m) {
      questionText = m[1].trim();
      options = [m[2].trim(), m[3].trim(), m[4].trim(), m[5].trim()];
      matched = true;
      break;
    }
  }
  
  // If the standard patterns didn't work, try splitting manually
  if (!matched) {
    // Find the first option marker
    const firstOpt = body.search(/\s[aA][\.\)]\s/);
    if (firstOpt > 0) {
      questionText = body.substring(0, firstOpt).trim();
      const optionsText = body.substring(firstOpt).trim();
      
      // Split by option markers
      const optParts = optionsText.split(/\s+[a-dA-D][\.\)]\s+/);
      if (optParts.length >= 4) {
        // First part might be empty or have the "a." prefix still
        let opts = optParts.filter(p => p.trim().length > 0);
        if (opts.length >= 4) {
          options = opts.slice(0, 4).map(o => o.trim());
          matched = true;
        }
      }
    }
  }
  
  // Special handling for questions with direction-style format (e.g., question 143, 147, 198)
  // These have answer options that reference other options like "a. D  b. B  c. A  d. C"
  
  if (matched && questionText.length > 5 && options.length === 4) {
    // Clean up options - remove trailing question numbers and noise
    options = options.map(o => {
      return o
        .replace(/\s*\(\s*\d+\s*[–-]\s*\d+\s*\).*$/i, '')  // direction ranges
        .replace(/\s*Direction:.*$/i, '')
        .replace(/\s*Directions\s*:.*$/i, '')
        .replace(/\s+\d{1,3}\.\s*$/, '')  // trailing question numbers
        .replace(/\s*\(\s*\d+\s*[-–]\s*\d+\s*$/, '')
        .replace(/\s*Quantitative Aptitude.*$/i, '')
        .trim();
    });
    
    // Determine the correct answer from the answer key
    const answerLetter = answerKey[qNum];
    let correctAnswerIndex = -1;
    if (answerLetter) {
      correctAnswerIndex = answerLetter.charCodeAt(0) - 'a'.charCodeAt(0); // 0-3
    }
    
    const q = {
      id: qNum,
      question: questionText,
      options: options,
    };
    
    if (correctAnswerIndex >= 0 && correctAnswerIndex < 4) {
      q.answer = correctAnswerIndex;
    }
    
    questions.push(q);
  }
}

// ============================================================
// STEP 3: Assign topics based on question ranges
// ============================================================
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

// ============================================================
// STEP 4: Statistics and output
// ============================================================
const topicCounts = {};
let withAnswers = 0;
let withoutAnswers = 0;
for (const q of questions) {
  topicCounts[q.topic] = (topicCounts[q.topic] || 0) + 1;
  if (q.answer !== undefined) withAnswers++;
  else withoutAnswers++;
}

console.log(`\nTotal parsed: ${questions.length} questions`);
console.log(`With answers: ${withAnswers}`);
console.log(`Without answers: ${withoutAnswers}`);
console.log('\nTopic breakdown:');
for (const [t, c] of Object.entries(topicCounts)) {
  console.log(`  ${t}: ${c}`);
}

// Show samples
console.log('\n--- Sample Questions ---');
const samples = [1, 5, 25, 50, 100, 200, 300, 400, 500, 600, 700, 750];
for (const sid of samples) {
  const q = questions.find(q => q.id === sid);
  if (q) {
    const ansLetter = q.answer !== undefined ? String.fromCharCode(97 + q.answer) : '?';
    console.log(`\nQ${q.id}: ${q.question.substring(0, 80)}...`);
    console.log(`  Options: ${q.options.map((o,i) => `${String.fromCharCode(97+i)}) ${o}`).join(' | ')}`);
    console.log(`  Answer: ${ansLetter}) ${q.answer !== undefined ? q.options[q.answer] : 'MISSING'}`);
  } else {
    console.log(`\nQ${sid}: NOT FOUND`);
  }
}

// Check for gaps
const ids = new Set(questions.map(q => q.id));
const missing = [];
for (let i = 1; i <= 750; i++) {
  if (!ids.has(i)) missing.push(i);
}
console.log(`\nMissing question IDs (${missing.length}):`, missing.slice(0, 50).join(', '), missing.length > 50 ? '...' : '');

// Save
fs.writeFileSync('src/data/questions.json', JSON.stringify(questions, null, 2));
console.log(`\nSaved ${questions.length} questions to src/data/questions.json`);
