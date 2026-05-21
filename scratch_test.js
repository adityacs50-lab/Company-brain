const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'cant', 'cannot', 'could', 'couldnt', 'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont',
  'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'hadnt', 'has', 'hasnt', 'have',
  'havent', 'having', 'he', 'hed', 'hell', 'hes', 'her', 'here', 'heres', 'hers', 'herself', 'him',
  'himself', 'his', 'how', 'hows', 'i', 'id', 'ill', 'im', 'ive', 'if', 'in', 'into', 'is', 'isnt',
  'it', 'its', 'itself', 'lets', 'me', 'more', 'most', 'mustnt', 'my', 'myself', 'no', 'nor', 'not',
  'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out',
  'over', 'own', 'same', 'shan' ,'she', 'shed', 'shell', 'shes', 'should', 'shouldnt', 'so', 'some',
  'such', 'than', 'that', 'thats', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there',
  'theres', 'these', 'they', 'theyd', 'theyll', 'theyre', 'theyve', 'this', 'those', 'through', 'to',
  'too', 'under', 'until', 'up', 'very', 'was', 'wasnt', 'we', 'wed', 'well', 'were', 'weve', 'werent',
  'what', 'whats', 'when', 'whens', 'where', 'wheres', 'which', 'while', 'who', 'whos', 'whom', 'why',
  'whys', 'with', 'wont', 'would', 'wouldnt', 'you', 'youd', 'youll', 'youre', 'youve', 'your',
  'yours', 'yourself', 'yourselves'
]);

function tokenizeWords(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1 && !STOP_WORDS.has(word))
    .map(word => {
      // Very simple stemmer
      return word
        .replace(/s$/, '')
        .replace(/ly$/, '')
        .replace(/ing$/, '')
        .replace(/ed$/, '')
        .replace(/ment$/, '');
    });
}

// 3-character n-gram generator
function tokenizeNgrams(text, n = 3) {
  const clean = text.toLowerCase().replace(/[^a-z0-9]/g, ' ');
  const ngrams = [];
  const words = clean.split(/\s+/).filter(Boolean);
  
  for (const word of words) {
    if (STOP_WORDS.has(word)) continue;
    if (word.length <= n) {
      ngrams.push(word);
    } else {
      for (let i = 0; i <= word.length - n; i++) {
        ngrams.push(word.substring(i, i + n));
      }
    }
  }
  return ngrams;
}

function calculateSimilarity(tokensA, tokensB) {
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  
  const getFreq = tokens => {
    const m = new Map();
    tokens.forEach(t => m.set(t, (m.get(t) || 0) + 1));
    return m;
  };
  
  const freqA = getFreq(tokensA);
  const freqB = getFreq(tokensB);
  
  const allTerms = new Set([...freqA.keys(), ...freqB.keys()]);
  let dot = 0, magA = 0, magB = 0;
  
  for (const term of allTerms) {
    const vA = freqA.get(term) || 0;
    const vB = freqB.get(term) || 0;
    dot += vA * vB;
    magA += vA * vA;
    magB += vB * vB;
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

const skillA = 'auto approve refunds under 50 check history and instant approve';
const skillB = 'instantly approve refund transactions less than 50 dollars';
const skillC = 'setup server database backups and configure nightly cron jobs';

console.log('--- WORD SIMILARITY ---');
console.log('A & B:', calculateSimilarity(tokenizeWords(skillA), tokenizeWords(skillB)));
console.log('A & C:', calculateSimilarity(tokenizeWords(skillA), tokenizeWords(skillC)));

console.log('\n--- 3-GRAM SIMILARITY ---');
console.log('A & B:', calculateSimilarity(tokenizeNgrams(skillA, 3), tokenizeNgrams(skillB, 3)));
console.log('A & C:', calculateSimilarity(tokenizeNgrams(skillA, 3), tokenizeNgrams(skillC, 3)));

console.log('\n--- 4-GRAM SIMILARITY ---');
console.log('A & B:', calculateSimilarity(tokenizeNgrams(skillA, 4), tokenizeNgrams(skillB, 4)));
console.log('A & C:', calculateSimilarity(tokenizeNgrams(skillA, 4), tokenizeNgrams(skillC, 4)));
