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
// STEP 2: Parse questions
// ============================================================
const questionTextAll = text.substring(0, text.indexOf('ANSWER KEY'));
const pages = questionTextAll.split(/--- PAGE \d+ ---/).filter(p => p.trim());
let allText = pages.join(' ').replace(/\s+/g, ' ').trim();

const questions = [];

// Find all question start positions
const questionStarts = [];
const qStartPattern = /(?:^|\s)(\d{1,3})\.\s/g;
let m;
while ((m = qStartPattern.exec(allText)) !== null) {
  questionStarts.push({
    num: parseInt(m[1]),
    pos: m.index,
    textStart: m.index + m[0].length
  });
}

// Filter to keep only sequential question numbers (first occurrence of each)
const seenNums = new Set();
const filteredStarts = [];
let lastAccepted = 0;

for (const qs of questionStarts) {
  if (seenNums.has(qs.num)) continue;
  if (qs.num < 1 || qs.num > 750) continue;
  
  if (filteredStarts.length === 0) {
    if (qs.num === 1) {
      filteredStarts.push(qs);
      seenNums.add(qs.num);
      lastAccepted = qs.num;
    }
  } else {
    if (qs.num > lastAccepted && qs.num <= lastAccepted + 10) {
      filteredStarts.push(qs);
      seenNums.add(qs.num);
      lastAccepted = qs.num;
    }
  }
}

console.log(`Found ${filteredStarts.length} question positions`);

// Extract each question
for (let i = 0; i < filteredStarts.length; i++) {
  const start = filteredStarts[i].textStart;
  const end = i + 1 < filteredStarts.length ? filteredStarts[i + 1].pos : allText.length;
  const body = allText.substring(start, end).trim();
  const qNum = filteredStarts[i].num;
  
  if (body.length < 10) continue;
  
  let questionText = '';
  let options = [];
  let matched = false;
  
  // Try multiple option extraction patterns (greedy from left)
  const optionPatterns = [
    /^([\s\S]*?)\s+(?:a[\.\)])\s*([\s\S]*?)\s+(?:b[\.\)])\s*([\s\S]*?)\s+(?:c[\.\)])\s*([\s\S]*?)\s+(?:d[\.\)])\s*([\s\S]*?)$/i,
    /^([\s\S]*?)\s+(?:A[\.\)])\s*([\s\S]*?)\s+(?:B[\.\)])\s*([\s\S]*?)\s+(?:C[\.\)])\s*([\s\S]*?)\s+(?:D[\.\)])\s*([\s\S]*?)$/,
  ];
  
  for (const pat of optionPatterns) {
    const om = body.match(pat);
    if (om) {
      questionText = om[1].trim();
      options = [om[2].trim(), om[3].trim(), om[4].trim(), om[5].trim()];
      matched = true;
      break;
    }
  }
  
  if (!matched) {
    // Fallback: find first "a." or "a)" and split from there
    const firstOpt = body.search(/\s[aA][\.\)]\s/);
    if (firstOpt > 0) {
      questionText = body.substring(0, firstOpt).trim();
      const rest = body.substring(firstOpt);
      const parts = rest.split(/\s+[bBcCdD][\.\)]\s+/);
      if (parts.length >= 4) {
        let opts = parts.map(p => p.replace(/^[aA][\.\)]\s*/, '').trim()).filter(p => p.length > 0);
        if (opts.length >= 4) {
          options = opts.slice(0, 4);
          matched = true;
        }
      }
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
        .trim();
    });
    
    const answerLetter = answerKey[qNum];
    let correctAnswerIndex = -1;
    if (answerLetter) {
      correctAnswerIndex = answerLetter.charCodeAt(0) - 'a'.charCodeAt(0);
    }
    
    const q = { id: qNum, question: questionText, options };
    if (correctAnswerIndex >= 0 && correctAnswerIndex < 4) {
      q.answer = correctAnswerIndex;
    }
    questions.push(q);
  }
}

// ============================================================
// STEP 3: Manually add all missing questions from the PDF
// ============================================================
const parsedIds = new Set(questions.map(q => q.id));

const manualQuestions = [
  { id: 5, question: "A two - digit number is such that the product of the digits is 8. When 18 is added to the number, then the digits are reversed. The number is:", options: ["18", "24", "42", "81"], answer: 1 },
  { id: 6, question: "The sum of the digits of a two - digit number is 15 and the difference between the digits is 3. What is the two - digit number?", options: ["69", "78", "96", "Cannot be determined"], answer: 0 },
  { id: 7, question: "The sum of the squares of three numbers is 138, while the sum of their products taken two at a time is 131. Their sum is:", options: ["20", "30", "40", "None of these"], answer: 0 },
  { id: 25, question: "The population of a town was 1,60,000 three years ago. If it increased by 3%, 2.5% and 5% respectively in the last three years, then the present population is?", options: ["155679", "167890", "179890", "177366"], answer: 3 },
  { id: 26, question: "Gaurav spends 30% of his monthly income on food articles, 40% of the remaining on conveyance and clothes and saves 50% of the remaining. If his monthly salary is Rs. 18,400, how much money does he save every month?", options: ["3864", "4903", "5849", "6789"], answer: 0 },
  { id: 28, question: "If the numerator of a fraction is increased by 150% and the denominator of the fraction is increased by 350%, the resultant fraction is 25/51. What is the original fraction?", options: ["31/25", "15/17", "14/25", "11/16"], answer: 1 },
  { id: 116, question: "The salaries of A, B, and C are in the ratio of 1 : 2 : 3. The salary of B and C together is Rs. 6000. By what percent is the salary of C more than that of A?", options: ["200%", "300%", "500%", "400%"], answer: 0 },
  { id: 487, question: "What is the difference between the number of cameras sold by Sony in 2017, 2018 and 2019 and the number of cameras sold by Fujifilm in 2018, 2019 and 2020?", options: ["2900", "3300", "2200", "2700"], answer: 3 },
  { id: 489, question: "The number of cameras sold of Canon in 2018 and 2020 is what percent more/less than the number of cameras sold of Nikon in 2017 and 2020?", options: ["2.5%", "4%", "1%", "3.66%"], answer: 0 },
  { id: 532, question: "The sum of the ages of 4 children born at the intervals of 4 years is 48. Find the age of the youngest child.", options: ["4 years", "5 years", "6 years", "7 years"], answer: 2 },
  { id: 549, question: "A batsman has a certain average of runs for 12 innings. In the 13th inning, he scores 96 runs thereby increasing his average by 5 runs. What is his average after the 13th inning?", options: ["31", "61", "36", "41"], answer: 3 },
  { id: 550, question: "The average age of 30 students in a class is 15 years. If the teacher's age is included, the average increases by 1 year. If the teacher's wife's age (who is 5 years younger than the teacher) is also included, what is the new average?", options: ["16.2", "16.5", "16.8", "17.1"], answer: 2 },
  { id: 555, question: "A library has an average of 510 visitors on Sundays and 240 on other days. The average number of visitors per day in a month of 30 days beginning with a Sunday is:", options: ["275", "280", "285", "300"], answer: 2 },
  { id: 556, question: "Of the three numbers, the first is twice the second and the second is twice the third. The average of the reciprocal of the numbers is 7/72. The numbers are:", options: ["16, 8, 4", "20, 10, 5", "24, 12, 6", "36, 18, 9"], answer: 2 },
  { id: 584, question: "The difference between S.I and C.I on certain sum of money for 3 years at 10% per annum is Rs. 248. Find the sum?", options: ["2000", "8000", "16000", "4000"], answer: 1 },
  { id: 586, question: "The simple interest on a sum of ₹1,000 for 2 years at 5% p.a. is invested at compound interest for 4 years at the same interest rate. What is the compound interest on the simple interest?", options: ["₹121.55", "₹25", "₹125", "₹21.55"], answer: 3 },
  { id: 613, question: "Vessel A has milk and water in ratio 3:2. Vessel B has water and milk in ratio 1:2. If x liters from A is added to B, the ratio of milk and water in B becomes 11:7. Find x.", options: ["10 liters", "18 liters", "12 liters", "Cannot be determined"], answer: 3 },
  { id: 616, question: "A milkman has 40 liters mixture of milk and water in the ratio of 5:3. He sold 16 liters, added 12 liters milk. Again sold 20 liters, added 8 liters milk. The final water is what percent of final milk?", options: ["10%", "15%", "20%", "25%"], answer: 2 },
  { id: 617, question: "Vessel A: Petrol:Diesel = 3:2, Vessel B: Petrol:Kerosene = 1:2, Vessel C: Kerosene:Diesel = 2:3. Mixed in ratio 4:3:2. Find ratio of Petrol, Diesel, Kerosene.", options: ["46:58:31", "56:63:32", "67:72:41", "None of these"], answer: 3 },
  { id: 648, question: "A beaker contains pure alcohol. 20% is replaced by water, then 20% of the new mixture, then 20% again. What percentage of pure alcohol is left?", options: ["40.8%", "48.0%", "50.0%", "51.2%"], answer: 3 },
  { id: 654, question: "Rs. 15,500 was lent partly at 5% and partly at 8% p.a. simple interest. Total interest after 3 years was Rs. 3,000. Find the ratio of money lent at 5% to 8%.", options: ["13:15", "15:16", "16:15", "17:14"], answer: 2 },
  { id: 670, question: "Statements: No network is dull. Only a few dull is fast. All fast is memory. Conclusions: I. Some memory are definitely not network. II. Some dull are not network.", options: ["Only conclusion I follows", "Only conclusion II follows", "Either I or II follows", "Both conclusions I and II follow"], answer: 3 },
  { id: 671, question: "Statements: All tennis is football. All football is basketball. No basketball is cricket. Conclusions: I. No football is cricket. II. All tennis is basketball.", options: ["Only conclusion I follows", "Only conclusion II follows", "Either I or II follows", "Both conclusions I and II follow"], answer: 3 },
  { id: 676, question: "Statements: Some mobiles are calculators. Some calculators are pens. Only a few pens are scales. Conclusions: I. Some mobiles being pens is a possibility. II. Some pens are not scales.", options: ["Only conclusion I follows", "Only conclusion II follows", "Neither follows", "Both conclusions follow"], answer: 3 },
  { id: 684, question: "Statements: All letters are envelopes. No envelope is post office. Some post offices are postmen. Conclusions: I. Some postmen are letters. II. No postman is letter.", options: ["Only conclusion I follows", "Only conclusion II follows", "Either I or II follows", "Both follow"], answer: 3 },
  { id: 694, question: "Statements: Some SRKs are actors. All actresses are actors. No actor is musician. Conclusions: I. Some SRKs are actresses. II. All musicians being actresses is possible. III. No SRK is an actress. IV. Some actors not being SRK is possible.", options: ["Only C2 follows", "Either C1 or C3 and C2 and C4 follow", "Only C2 and C4 follow", "None of these"], answer: 3 },
  { id: 717, question: "If the difference between two expenditures are represented by 18° in the pie-chart, then these expenditures possibly are:", options: ["Binding Cost and Promotion Cost", "Paper Cost and Royalty", "Binding Cost and Printing Cost", "Paper Cost and Printing Cost"], answer: 3 },
  { id: 718, question: "For an edition of 12,500 copies, the amount of Royalty paid by the publisher is Rs. 2,81,250. What should be the selling price if the publisher desires a profit of 5%?", options: ["Rs. 152.50", "Rs. 157.50", "Rs. 162.50", "Rs. 167.50"], answer: 1 },
];

for (const mq of manualQuestions) {
  if (!parsedIds.has(mq.id)) {
    questions.push(mq);
    parsedIds.add(mq.id);
  }
}

// Sort by id
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
// STEP 5: Stats
// ============================================================
const topicCounts = {};
let withAnswers = 0;
for (const q of questions) {
  topicCounts[q.topic] = (topicCounts[q.topic] || 0) + 1;
  if (q.answer !== undefined) withAnswers++;
}

console.log(`\n✅ Total: ${questions.length} questions (${withAnswers} with answers)`);
console.log('\nTopic breakdown:');
for (const [t, c] of Object.entries(topicCounts).sort((a,b) => a[0].localeCompare(b[0]))) {
  console.log(`  ${t}: ${c}`);
}

// Verify samples
console.log('\n--- Verification ---');
for (const sid of [1, 5, 6, 7, 25, 100, 500, 750]) {
  const q = questions.find(q => q.id === sid);
  if (q) {
    const l = q.answer !== undefined ? String.fromCharCode(97 + q.answer) : '?';
    console.log(`Q${q.id}: ${l}) ${q.answer !== undefined ? q.options[q.answer] : 'MISSING'}`);
  }
}

// Missing
const finalIds = new Set(questions.map(q => q.id));
const stillMissing = [];
for (let i = 1; i <= 750; i++) {
  if (!finalIds.has(i)) stillMissing.push(i);
}
console.log(`\nMissing (${stillMissing.length}):`, stillMissing.length > 0 ? stillMissing.join(', ') : 'NONE');

fs.writeFileSync('src/data/questions.json', JSON.stringify(questions, null, 2));
console.log(`\n✅ Saved ${questions.length} questions to src/data/questions.json`);
