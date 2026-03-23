const data = require('./robin_olds.json');
const html = data.parse.text['*'];

const sectionStart = html.indexOf('Awards and decorations');
const afterSection = html.slice(sectionStart);
const nextH2Match = afterSection.match(/<h2[^>]*>/);
const sectionEnd = nextH2Match ? nextH2Match.index : 5000;
const section = afterSection.slice(0, sectionEnd);

// Show ALL td cells in text rows with full detail
const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
let rowMatch;
let rowIdx = 0;
while ((rowMatch = rowRegex.exec(section)) !== null) {
  const rowHtml = rowMatch[1];
  const imgs = rowHtml.match(/<img[^>]+>/gi) || [];
  const text = rowHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const isImageDominant = imgs.length > 0 && text.length <= imgs.length * 30;

  if (!isImageDominant && text.length > 3) {
    console.log(`\n--- Text Row ${rowIdx} ---`);
    // Show individual td cells
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tdMatch;
    let tdIdx = 0;
    while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
      const cellHtml = tdMatch[1];
      const cellText = cellHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      const links = cellHtml.match(/<a[^>]*>([^<]+)<\/a>/g) || [];
      const linkTexts = links.map(l => l.replace(/<[^>]+>/g, ''));
      console.log(`  TD ${tdIdx}: links=[${linkTexts.join(' | ')}] text="${cellText}"`);
      tdIdx++;
    }
  }
  rowIdx++;
}

// Now simulate the scraper's parseAwardLines logic more carefully
console.log('\n\n=== SIMULATING parseAwardLines ===');
// The scraper processes td cells across all rows, looking for first <a> tag
const allTdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
let tdMatch2;
let medalNames = [];
let allCellTexts = [];
while ((tdMatch2 = allTdRegex.exec(section)) !== null) {
  const cellHtml = tdMatch2[1];
  const cellImgs = cellHtml.match(/<img/gi) || [];
  const text = cellHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

  // Skip image-dominant cells (ribbon rack)
  if (cellImgs.length > 0 && text.length < cellImgs.length * 30) continue;

  const aMatch = cellHtml.match(/<a[^>]*>([^<]+)<\/a>/);
  if (aMatch && text.length > 5) {
    medalNames.push(aMatch[1]);
    allCellTexts.push(text);
  } else if (text.length > 5) {
    allCellTexts.push(`[no-link] ${text}`);
  }
}

console.log('Medal names extracted:');
medalNames.forEach((m, i) => console.log(`  ${i+1}. ${m}`));
console.log(`Total: ${medalNames.length}`);

// Check which ribbon has no corresponding medal
const ribbonNames = [
  'Air Force Cross', 'Air Force Distinguished Service Medal', 'Silver Star',
  'Legion of Merit', 'Distinguished Flying Cross', 'Air Medal', 'Air Medal', 'Air Medal',
  'Air Force Commendation Medal', 'AF Presidential Unit Citation', 'Outstanding Unit Award', 'Outstanding Unit Award',
  'American Defense Service Medal', 'American Campaign Medal', 'European-African-Middle Eastern Campaign',
  'World War II Victory Medal', 'National Defense Service Medal', 'Vietnam Service Medal',
  'Air Force Longevity Service Award', 'Marksmanship Ribbon', 'Distinguished Flying Cross (UK)',
  'Croix de Guerre', 'Vietnam Air Force Distinguished Service Order', 'Vietnam Air Gallantry Cross',
  'Vietnam Air Service Medal', 'Vietnam Gallantry Cross Unit Citation', 'Vietnam Campaign Medal'
];

// Check: is "Vietnam Air Service Medal" in the extracted medal names?
console.log('\n=== Check for Vietnam Air Service Medal ===');
const hasVASM = medalNames.some(m => /Vietnam Air Service/i.test(m));
console.log(`Found "Vietnam Air Service Medal" in extracted names: ${hasVASM}`);

// Show row 19 in detail
console.log('\n=== Row 19 detail ===');
const row19Regex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
let r19Match;
let r19Idx = 0;
while ((r19Match = row19Regex.exec(section)) !== null) {
  if (r19Idx === 19) {
    console.log('Raw HTML (first 2000 chars):');
    console.log(r19Match[0].slice(0, 2000));
  }
  r19Idx++;
}
