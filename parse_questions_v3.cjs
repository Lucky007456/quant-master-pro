const fs = require('fs');
const text = fs.readFileSync('../pdf_full_text.txt', 'utf8');

// ============================================================
// STEP 1: Parse the answer key from pages 89-92
// ============================================================
const answerKey = {};
const answerKeySection = text.substring(text.indexOf('ANSWER KEY'));
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
// STEP 2: Parse questions page by page for better accuracy
// ============================================================

// Get only question pages (before answer key)
const questionTextAll = text.substring(0, text.indexOf('ANSWER KEY'));

// Split into pages
const pageChunks = questionTextAll.split(/--- PAGE \d+ ---/).filter(p => p.trim());

// Combine into one blob with normalized whitespace
let allText = pageChunks.join(' ').replace(/\s+/g, ' ').trim();

// Strategy: We know questions go from 1-750.
// For each expected question number, try to find it and extract its body
const questions = [];
const allPositions = [];

// Find ALL occurrences of "N. " patterns
const allQPattern = /(?:^|\s)(\d{1,3})\.\s/g;
let m;
while ((m = allQPattern.exec(allText)) !== null) {
  allPositions.push({
    num: parseInt(m[1]),
    pos: m.index,
    textStart: m.index + m[0].length
  });
}

// For each question 1-750, find the best matching position
const bestPositions = [];
let lastPos = -1;

for (let qNum = 1; qNum <= 750; qNum++) {
  // Find all occurrences of this number
  const candidates = allPositions.filter(p => p.num === qNum && p.pos > lastPos);
  
  if (candidates.length > 0) {
    // Take the first one that's after our last position
    bestPositions.push(candidates[0]);
    lastPos = candidates[0].pos;
  }
}

console.log(`Found ${bestPositions.length} question positions`);

// Extract question bodies
for (let i = 0; i < bestPositions.length; i++) {
  const start = bestPositions[i].textStart;
  const end = i + 1 < bestPositions.length ? bestPositions[i + 1].pos : allText.length;
  let body = allText.substring(start, end).trim();
  const qNum = bestPositions[i].num;
  
  if (body.length < 10) continue;
  
  // Parse question text and options
  let questionText = '';
  let options = [];
  let matched = false;
  
  // Try multiple strategies to extract options
  
  // Strategy 1: Find the LAST set of a./a) b./b) c./c) d./d) markers
  // This handles cases where the question text itself contains letters like "A" or "B"
  
  // Find all 'd)' or 'd.' positions (the last option marker is most reliable)
  const dMarkerRegex = /\s[dD][\.\)]\s/g;
  let lastDPos = -1;
  let dm;
  while ((dm = dMarkerRegex.exec(body)) !== null) {
    lastDPos = dm.index;
  }
  
  if (lastDPos > 0) {
    // Now work backwards to find c, b, a markers before this d
    const beforeD = body.substring(0, lastDPos);
    
    // Find last c marker
    const cMarkerRegex = /\s[cсcC][\.\)]\s/g;
    let lastCPos = -1;
    let cm;
    while ((cm = cMarkerRegex.exec(beforeD)) !== null) {
      lastCPos = cm.index;
    }
    
    if (lastCPos > 0) {
      const beforeC = body.substring(0, lastCPos);
      
      // Find last b marker
      const bMarkerRegex = /\s[bB][\.\)]\s/g;
      let lastBPos = -1;
      let bm;
      while ((bm = bMarkerRegex.exec(beforeC)) !== null) {
        lastBPos = bm.index;
      }
      
      if (lastBPos > 0) {
        const beforeB = body.substring(0, lastBPos);
        
        // Find last a marker
        const aMarkerRegex = /\s[aA][\.\)]\s/g;
        let lastAPos = -1;
        let am;
        while ((am = aMarkerRegex.exec(beforeB)) !== null) {
          lastAPos = am.index;
        }
        
        if (lastAPos > 0) {
          questionText = body.substring(0, lastAPos).trim();
          
          // Extract option text between markers
          const optA = body.substring(lastAPos).match(/\s[aA][\.\)]\s*(.*?)\s+[bB][\.\)]/s);
          const optB = body.substring(lastBPos).match(/\s[bB][\.\)]\s*(.*?)\s+[cсcC][\.\)]/s);
          const optC = body.substring(lastCPos).match(/\s[cсcC][\.\)]\s*(.*?)\s+[dD][\.\)]/s);
          const optD = body.substring(lastDPos).match(/\s[dD][\.\)]\s*(.*?)$/s);
          
          if (optA && optB && optC && optD) {
            options = [
              optA[1].trim(),
              optB[1].trim(),
              optC[1].trim(),
              optD[1].trim()
            ];
            matched = true;
          }
        }
      }
    }
  }
  
  // Strategy 2: Simple regex split (fallback)
  if (!matched) {
    const simpleMatch = body.match(/^([\s\S]*?)\s+[aA][\.\)]\s+([\s\S]*?)\s+[bB][\.\)]\s+([\s\S]*?)\s+[cсcC][\.\)]\s*([\s\S]*?)\s+[dD][\.\)]\s+([\s\S]*?)$/);
    if (simpleMatch) {
      questionText = simpleMatch[1].trim();
      options = [simpleMatch[2].trim(), simpleMatch[3].trim(), simpleMatch[4].trim(), simpleMatch[5].trim()];
      matched = true;
    }
  }
  
  // Strategy 3: For questions with A) B) C) D) followed by "a. X b. Y c. Z d. W" answer format
  if (!matched) {
    // Some questions have embedded A) B) C) D) choices then a. b. c. d. as answer
    const embeddedMatch = body.match(/^([\s\S]*?[A-D][\.\)]\s+[\s\S]*?)\s+a[\.\)]\s+([\s\S]*?)\s+b[\.\)]\s+([\s\S]*?)\s+c[\.\)]\s+([\s\S]*?)\s+d[\.\)]\s+([\s\S]*?)$/i);
    if (embeddedMatch) {
      questionText = embeddedMatch[1].trim();
      options = [embeddedMatch[2].trim(), embeddedMatch[3].trim(), embeddedMatch[4].trim(), embeddedMatch[5].trim()];
      matched = true;
    }
  }
  
  if (matched && questionText.length > 5 && options.length === 4) {
    // Clean up options
    options = options.map(o => {
      return o
        .replace(/\s*\(\s*\d+\s*[–-]\s*\d+\s*\).*$/i, '')
        .replace(/\s*Direction:.*$/i, '')
        .replace(/\s*Directions\s*:.*$/i, '')
        .replace(/\s+\d{1,3}\.\s*$/, '')
        .replace(/\s*\(\s*\d+\s*[-–]\s*\d+\s*$/, '')
        .replace(/\s*Quantitative Aptitude.*$/i, '')
        .replace(/\s*Conclusions:.*$/i, '')
        .replace(/\s*Conclusion:.*$/i, '')
        .replace(/\s*Statements:.*$/i, '')
        .replace(/\s*Statement:.*$/i, '')
        .trim();
    });
    
    // Determine correct answer
    const answerLetter = answerKey[qNum];
    let correctAnswerIndex = -1;
    if (answerLetter) {
      correctAnswerIndex = answerLetter.charCodeAt(0) - 'a'.charCodeAt(0);
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
// STEP 3: Handle manually the trickiest missing questions
// These are questions where the PDF text is ambiguous
// ============================================================

// Check which questions we're missing
const parsedIds = new Set(questions.map(q => q.id));
const missingIds = [];
for (let i = 1; i <= 750; i++) {
  if (!parsedIds.has(i)) missingIds.push(i);
}

// Manually add commonly-missed questions from the PDF text
const manualQuestions = [
  {
    id: 5,
    question: "A two - digit number is such that the product of the digits is 8. When 18 is added to the number, then the digits are reversed. The number is:",
    options: ["18", "24", "42", "81"],
    answer: 1,
    topic: "Number Systems & Simplification"
  },
  {
    id: 6,
    question: "The sum of the digits of a two - digit number is 15 and the difference between the digits is 3. What is the two - digit number?",
    options: ["69", "78", "96", "Cannot be determined"],
    answer: 0,
    topic: "Number Systems & Simplification"
  },
  {
    id: 7,
    question: "The sum of the squares of three numbers is 138, while the sum of their products taken two at a time is 131. Their sum is:",
    options: ["20", "30", "40", "None of these"],
    answer: 0,
    topic: "Number Systems & Simplification"
  },
  {
    id: 25,
    question: "The population of a town was 1,60,000 three years ago, If it increased by 3%, 2.5% and 5% respectively in the last three years, then the present population is?",
    options: ["155679", "167890", "179890", "177366"],
    answer: 3,
    topic: "Percentages"
  },
  {
    id: 26,
    question: "Gaurav spends 30% of his monthly income on food articles, 40% of the remaining on conveyance and clothes and saves 50% of the remaining. If his monthly salary is Rs. 18,400, how much money does he save every month?",
    options: ["3864", "4903", "5849", "6789"],
    answer: 0,
    topic: "Percentages"
  },
  {
    id: 28,
    question: "If the numerator of a fraction is increased by 150% and the denominator of the fraction is increased by 350%, the resultant fraction is 25/51. What is the original fraction?",
    options: ["31/25", "15/17", "14/25", "11/16"],
    answer: 1,
    topic: "Percentages"
  },
  {
    id: 116,
    question: "The salaries of A, B, and C are in the ratio of 1 : 2 : 3. The salary of B and C together is Rs. 6000. By what percent is the salary of C more than that of A?",
    options: ["200%", "300%", "500%", "400%"],
    answer: 0,
    topic: "Ratio & Proportion"
  },
  {
    id: 532,
    question: "The sum of the ages of 4 children born at the intervals of 4 years is 48. Find the age of the youngest child.",
    options: ["4 years", "5 years", "6 years", "7 years"],
    answer: 2,
    topic: "Data Interpretation & Averages"
  },
  {
    id: 549,
    question: "A batsman has a certain average of runs for 12 innings. In the 13th inning, he scores 96 runs thereby increasing his average by 5 runs. What is his average after the 13th inning?",
    options: ["31", "61", "36", "41"],
    answer: 3,
    topic: "Data Interpretation & Averages"
  },
  {
    id: 550,
    question: "The average age of 30 students in a class is 15 years. If the teacher's age is included, the average increases by 1 year. If the teacher's wife's age (who is 5 years younger than the teacher) is also included, what is the new average of the class?",
    options: ["16.2", "16.5", "16.8", "17.1"],
    answer: 2,
    topic: "Data Interpretation & Averages"
  },
  {
    id: 555,
    question: "A library has an average of 510 visitors on Sundays and 240 on other days. The average number of visitors per day in a month of 30 days beginning with a Sunday is:",
    options: ["275", "280", "285", "300"],
    answer: 2,
    topic: "Data Interpretation & Averages"
  },
  {
    id: 556,
    question: "Of the three numbers, the first is twice the second and the second is twice the third. The average of the reciprocal of the numbers is 7/72. The numbers are:",
    options: ["16, 8, 4", "20, 10, 5", "24, 12, 6", "36, 18, 9"],
    answer: 2,
    topic: "Data Interpretation & Averages"
  },
  {
    id: 584,
    question: "The difference between S.I and C.I on certain of money for 3 years at 10% per annum is Rs. 248. Find the sum?",
    options: ["2000", "8000", "16000", "4000"],
    answer: 1,
    topic: "Simple & Compound Interest / Mixtures"
  },
  {
    id: 586,
    question: "The simple interest on a sum of ₹ 1,000 for 2 years at 5% p.a. is invested at compound interest for 4 years at the same interest rate. What is the compound interest on the simple interest?",
    options: ["₹121.55", "₹25", "₹125", "₹21.55"],
    answer: 3,
    topic: "Simple & Compound Interest / Mixtures"
  },
  {
    id: 487,
    question: "What is the difference between the number of cameras sold by Sony in 2017, 2018 and 2019 and the number of cameras sold by Fujifilm in 2018, 2019 and 2020?",
    options: ["2900", "3300", "2200", "2700"],
    answer: 3,
    topic: "Data Interpretation & Averages"
  },
  {
    id: 489,
    question: "The number of cameras sold of Canon in 2018 and 2020 is what percent more/less than the number of cameras sold of Nikon in 2017 and 2020?",
    options: ["2.5%", "4%", "1%", "3.66%"],
    answer: 0,
    topic: "Data Interpretation & Averages"
  },
  {
    id: 613,
    question: "The vessel A contains the mixture of milk and water in the ratio of 3:2 and the vessel B contains the mixture of water and milk in the ratio of 1:2. If x liters of the mixture taken out from vessel A and is added to vessel B, then the ratio of the milk and water in vessel B becomes 11:7, then find the value of x?",
    options: ["10 liters", "18 liters", "12 liters", "Cannot be determined"],
    answer: 3,
    topic: "Simple & Compound Interest / Mixtures"
  },
  {
    id: 616,
    question: "A milkman has 40 liters mixture of milk and water in the ratio of 5:3. If he sold 16 liters of mixture and then 12 liters of milk added to the mixture. Again he sold 20 liters of mixture and then he added 8 liters of milk to the mixture. The final quantity of the water is what percent of the final quantity of the milk?",
    options: ["10%", "15%", "20%", "25%"],
    answer: 2,
    topic: "Simple & Compound Interest / Mixtures"
  },
  {
    id: 617,
    question: "Vessel A contains the mixture of Petrol and Diesel in the ratio of 3: 2, vessel B contains the mixture of Petrol and Kerosene in the ratio of 1: 2 and Vessel C contains mixture of Kerosene and Diesel in the ratio of 2: 3. If all the vessels are mixed in the ratio of 4: 3: 2, then find the respective ratio of Petrol, Diesel and Kerosene in the final mixture?",
    options: ["46: 58: 31", "56: 63: 32", "67: 72: 41", "None of these"],
    answer: 3,
    topic: "Simple & Compound Interest / Mixtures"
  },
  {
    id: 648,
    question: "A beaker contains pure alcohol. 20% of the alcohol is replaced by water. Then, 20% of the new mixture is replaced by water. Finally, 20% of the resulting mixture is replaced by water. What is the percentage of pure alcohol left in the beaker?",
    options: ["40.8%", "48.0%", "50.0%", "51.2%"],
    answer: 3,
    topic: "Simple & Compound Interest / Mixtures"
  },
  {
    id: 654,
    question: "A sum of Rs. 15,500 was lent partly at 5% and partly at 8% per annum simple interest. The total interest received after 3 years was Rs. 3,000. Find the ratio of the money lent at 5% to that lent at 8%.",
    options: ["13:15", "15:16", "16:15", "17:14"],
    answer: 2,
    topic: "Simple & Compound Interest / Mixtures"
  },
  {
    id: 670,
    question: "Statements: No network is dull. Only a few dull is fast. All fast is memory. Conclusions: I. Some memory are definitely not network. II. Some dull are not network.",
    options: ["If only conclusion I follows", "If only conclusion II follows", "If either conclusion I or II follows", "If both conclusions I and II follow."],
    answer: 3,
    topic: "Logical Reasoning (Syllogisms)"
  },
  {
    id: 671,
    question: "Statements: All tennis is football. All football is basketball. No basketball is cricket. Conclusions: I. No football is cricket. II. All tennis is basketball.",
    options: ["If only conclusion I follows", "If only conclusion II follows", "If either conclusion I or II follows", "If both conclusions I and II follow."],
    answer: 3,
    topic: "Logical Reasoning (Syllogisms)"
  },
  {
    id: 676,
    question: "Statements: I. Some mobiles are calculators II. Some calculators are pens III. Only a few pens are scales Conclusions: I. Some mobiles being pens is a possibility II. Some pens are not scales.",
    options: ["Only conclusion I follows", "Only conclusion II follows", "Neither conclusion I nor II follows", "Both conclusion I and II follows"],
    answer: 3,
    topic: "Logical Reasoning (Syllogisms)"
  },
  {
    id: 684,
    question: "Statements: 1. All letters are envelopes. 2. No envelope is post office. 3. Some post offices are postmen. Conclusions: I. Some postmen are letters. II. No postman is letter.",
    options: ["If only conclusion I follows", "If only conclusion II follows", "If either conclusion I or II follows", "If both conclusion I and II follow"],
    answer: 3,
    topic: "Logical Reasoning (Syllogisms)"
  },
  {
    id: 694,
    question: "Statements: 1. Some SRKs are actors. 2. All actresses are actors. 3. No actor is musician. Conclusions: I. Some SRKs are actresses. II. All musicians being actresses is a possibility. III. No SRK is an actress. IV. Some actors not being SRK is a possibility.",
    options: ["Only C2 follows", "Either C1 or C3 and C2 and C4 follow", "Only C2 and C4 follow", "None of these"],
    answer: 3,
    topic: "Logical Reasoning (Syllogisms)"
  },
  {
    id: 717,
    question: "If the difference between the two expenditures are represented by 18° in the pie-chart, then these expenditures possibly are",
    options: ["Binding Cost and Promotion Cost", "Paper Cost and Royalty", "Binding Cost and Printing Cost", "Paper Cost and Printing Cost"],
    answer: 3,
    topic: "Data Interpretation Advanced"
  },
  {
    id: 718,
    question: "For an edition of 12,500 copies, the amount of Royalty paid by the publisher is Rs. 2,81,250. What should be the selling price of the book if the publisher desires a profit of 5%?",
    options: ["Rs. 152.50", "Rs. 157.50", "Rs. 162.50", "Rs. 167.50"],
    answer: 1,
    topic: "Data Interpretation Advanced"
  }
];

// Add manual questions that are still missing
for (const mq of manualQuestions) {
  if (!parsedIds.has(mq.id)) {
    questions.push(mq);
    parsedIds.add(mq.id);
  }
}

// Sort questions by id
questions.sort((a, b) => a.id - b.id);

// ============================================================
// STEP 4: Assign topics
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
  if (!q.topic) {
    q.topic = "General Aptitude";
    for (const [start, end, topic] of topicRanges) {
      if (q.id >= start && q.id <= end) {
        q.topic = topic;
        break;
      }
    }
  }
}

// ============================================================
// STEP 5: Statistics
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
for (const [t, c] of Object.entries(topicCounts).sort((a,b) => a[0].localeCompare(b[0]))) {
  console.log(`  ${t}: ${c}`);
}

// Verify samples
console.log('\n--- Verification Samples ---');
const samples = [1, 5, 6, 7, 25, 50, 100, 200, 300, 400, 500, 600, 700, 750];
for (const sid of samples) {
  const q = questions.find(q => q.id === sid);
  if (q) {
    const ansLetter = q.answer !== undefined ? String.fromCharCode(97 + q.answer) : '?';
    console.log(`\nQ${q.id}: ${q.question.substring(0, 90)}...`);
    console.log(`  Options: ${q.options.map((o,i) => `${String.fromCharCode(97+i)}) ${o}`).join(' | ')}`);
    console.log(`  Answer: ${ansLetter}) ${q.answer !== undefined ? q.options[q.answer] : 'MISSING'}`);
  } else {
    console.log(`\nQ${sid}: *** NOT FOUND ***`);
  }
}

// Final missing check
const finalIds = new Set(questions.map(q => q.id));
const stillMissing = [];
for (let i = 1; i <= 750; i++) {
  if (!finalIds.has(i)) stillMissing.push(i);
}
console.log(`\nStill missing (${stillMissing.length}):`, stillMissing.join(', '));

// Save
fs.writeFileSync('src/data/questions.json', JSON.stringify(questions, null, 2));
console.log(`\n✅ Saved ${questions.length} questions to src/data/questions.json`);
