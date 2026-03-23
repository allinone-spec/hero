const data = require('./bud_day.json');
const html = data.parse.text['*'];

// --- Simulate ribbon rack extraction ---
function isRibbonImage(imgTag, src) {
  const hasRibbonInName = /ribbon/i.test(src);
  const wMatch = imgTag.match(/width="(\d+)"/i);
  const hMatch = imgTag.match(/height="(\d+)"/i);
  const w = wMatch ? parseInt(wMatch[1]) : 0;
  const h = hMatch ? parseInt(hMatch[1]) : 0;
  const isRibbonShaped = w >= 80 && w <= 150 && h > 0 && w / h > 2.5;
  return hasRibbonInName || isRibbonShaped;
}

// Find the ribbon rack table
const sectionStart = html.indexOf('Badges and awards');
const afterSection = html.slice(sectionStart);
const nextH2Match = afterSection.match(/<h2[^>]*>/);
const sectionEnd = nextH2Match ? nextH2Match.index : 5000;
const section = afterSection.slice(0, sectionEnd);

// Extract ribbon cells
const ribbonCells = [];
const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
let rowMatch;
while ((rowMatch = rowRegex.exec(section)) !== null) {
  const rowHtml = rowMatch[1];
  const rowImgs = rowHtml.match(/<img[^>]+>/gi) || [];
  const textOnly = rowHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  if (rowImgs.length === 0 || textOnly.length > rowImgs.length * 30) continue;

  const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let tdMatch;
  while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
    const cellHtml = tdMatch[1];
    const cellImgs = cellHtml.match(/<img[^>]+>/gi) || [];
    if (cellImgs.length === 0) continue;

    for (const imgTag of cellImgs) {
      const srcMatch = imgTag.match(/src="([^"]+)"/i);
      if (!srcMatch) continue;
      let src = srcMatch[1];

      const isDeviceImg =
        /ribbonstar|ribbonbar/i.test(src) ||
        (() => {
          const thumbSize = src.match(/\/(\d+)px-/);
          if (thumbSize && parseInt(thumbSize[1]) < 50) return true;
          const w = imgTag.match(/width="(\d+)"/i);
          if (w && parseInt(w[1]) < 50) return true;
          return false;
        })();

      if (!isDeviceImg && isRibbonImage(imgTag, src)) {
        const fn = decodeURIComponent(src.split('/').pop().replace(/^\d+px-/, ''));
        ribbonCells.push(fn);
      }
    }
  }
}

// --- Extract medal names from td cells ---
const medalNames = [];
const medalTdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
let tdMatch2;
while ((tdMatch2 = medalTdRegex.exec(section)) !== null) {
  const cellHtml = tdMatch2[1];
  // Skip cells that are image-only (ribbon rack)
  const hasImages = /<img/i.test(cellHtml);
  const text = cellHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  // Medal text cells have links and significant text
  const aMatch = cellHtml.match(/<a[^>]*>([^<]+)<\/a>/);
  if (aMatch && text.length > 5) {
    // Skip if it's in the ribbon rack (image-dominant)
    const imgs = cellHtml.match(/<img/gi) || [];
    if (imgs.length > 0 && text.length < imgs.length * 30) continue;
    if (hasImages && /ribbon|svg|png/i.test(cellHtml) && text.length < 100) continue;

    medalNames.push(aMatch[1]);
  }
}

console.log('=== RIBBON CELLS ===');
ribbonCells.forEach((r, i) => console.log(`  ${i+1}. ${r}`));
console.log(`\nTotal ribbon cells: ${ribbonCells.length}`);

console.log('\n=== MEDAL NAMES (from text cells) ===');
medalNames.forEach((m, i) => console.log(`  ${i+1}. ${m}`));
console.log(`\nTotal medal names: ${medalNames.length}`);

console.log(`\nDifference: ${ribbonCells.length - medalNames.length} (ribbons - medals)`);
