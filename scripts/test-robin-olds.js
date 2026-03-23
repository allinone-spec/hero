const data = require('./robin_olds.json');
const html = data.parse.text['*'];

// Find awards section
const sectionPatterns = ['Awards and decorations', 'Badges and awards', 'Decorations and awards', 'Military awards'];
let sectionStart = -1;
let sectionName = '';
for (const p of sectionPatterns) {
  const idx = html.indexOf(p);
  if (idx !== -1 && (sectionStart === -1 || idx < sectionStart)) {
    sectionStart = idx;
    sectionName = p;
  }
}
console.log(`Section: "${sectionName}" at index ${sectionStart}`);

if (sectionStart === -1) {
  console.log('No awards section found!');
  // Try to find any heading with "award" or "decoration"
  const hRegex = /<h[2-4][^>]*>[\s\S]*?<\/h[2-4]>/gi;
  let m;
  while ((m = hRegex.exec(html)) !== null) {
    const text = m[0].replace(/<[^>]+>/g, '').trim();
    if (/award|decor|medal|badge/i.test(text)) {
      console.log(`  Found heading: "${text}" at ${m.index}`);
    }
  }
  process.exit(0);
}

const afterSection = html.slice(sectionStart);
const nextH2Match = afterSection.match(/<h2[^>]*>/);
const sectionEnd = nextH2Match ? nextH2Match.index : 5000;
const section = afterSection.slice(0, sectionEnd);

console.log(`Section length: ${section.length} chars`);

// Show all rows with classification
const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
let rowMatch;
let rowIdx = 0;
while ((rowMatch = rowRegex.exec(section)) !== null) {
  const rowHtml = rowMatch[1];
  const imgs = rowHtml.match(/<img[^>]+>/gi) || [];
  const text = rowHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

  const ribbonImgs = imgs.filter(img => {
    const src = (img.match(/src="([^"]+)"/i) || [])[1] || '';
    const wMatch = img.match(/width="(\d+)"/i);
    const hMatch = img.match(/height="(\d+)"/i);
    const w = wMatch ? parseInt(wMatch[1]) : 0;
    const h = hMatch ? parseInt(hMatch[1]) : 0;
    return /ribbon/i.test(src) || (w >= 80 && w <= 150 && h > 0 && w/h > 2.5);
  });

  const isImageDominant = imgs.length > 0 && text.length <= imgs.length * 30;
  const type = isImageDominant ? (ribbonImgs.length > 0 ? 'RIBBON-ROW' : 'BADGE-ROW') : 'TEXT-ROW';

  console.log(`Row ${rowIdx} [${type}]: ${imgs.length} imgs (${ribbonImgs.length} ribbons), text="${text.slice(0, 120)}"`);
  rowIdx++;
}

// Count ribbon images
const allImgs = section.match(/<img[^>]+>/gi) || [];
let ribbonCount = 0;
let nonRibbonImgs = [];
for (const img of allImgs) {
  const src = (img.match(/src="([^"]+)"/i) || [])[1] || '';
  const wMatch = img.match(/width="(\d+)"/i);
  const hMatch = img.match(/height="(\d+)"/i);
  const w = wMatch ? parseInt(wMatch[1]) : 0;
  const h = hMatch ? parseInt(hMatch[1]) : 0;
  const isRibbon = /ribbon/i.test(src) || (w >= 80 && w <= 150 && h > 0 && w/h > 2.5);
  if (isRibbon) {
    ribbonCount++;
    const fn = decodeURIComponent(src.split('/').pop().replace(/^\d+px-/, ''));
    console.log(`  Ribbon: ${fn} (${w}x${h})`);
  }
}
console.log(`\nTotal ribbon images: ${ribbonCount}`);

// Extract medal names from text rows
console.log('\n=== MEDAL NAMES (from text cells) ===');
const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
let tdMatch;
let medalIdx = 0;
while ((tdMatch = tdRegex.exec(section)) !== null) {
  const cellHtml = tdMatch[1];
  const cellImgs = cellHtml.match(/<img/gi) || [];
  const text = cellHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const aMatch = cellHtml.match(/<a[^>]*>([^<]+)<\/a>/);

  if (aMatch && text.length > 5) {
    // Skip image-dominant cells
    if (cellImgs.length > 0 && text.length < cellImgs.length * 30) continue;
    console.log(`  ${++medalIdx}. ${aMatch[1]} — "${text.slice(0, 100)}"`);
  }
}
console.log(`\nTotal medal names: ${medalIdx}`);
