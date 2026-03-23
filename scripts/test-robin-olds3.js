const data = require('./robin_olds.json');
const html = data.parse.text['*'];

const sectionStart = html.indexOf('Awards and decorations');
const afterSection = html.slice(sectionStart);
const nextH2Match = afterSection.match(/<h2[^>]*>/);
const sectionEnd = nextH2Match ? nextH2Match.index : 5000;
const section = afterSection.slice(0, sectionEnd);

function isRibbonImage(imgTag, src) {
  const hasRibbonInName = /ribbon/i.test(src);
  const wMatch = imgTag.match(/width="(\d+)"/i);
  const hMatch = imgTag.match(/height="(\d+)"/i);
  const w = wMatch ? parseInt(wMatch[1]) : 0;
  const h = hMatch ? parseInt(hMatch[1]) : 0;
  return hasRibbonInName || (w >= 80 && w <= 150 && h > 0 && w / h > 2.5);
}

// Simulate extractRibbonRackCells
const cells = [];
let maxPerRow = 0;
const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
let rowMatch;
while ((rowMatch = rowRegex.exec(section)) !== null) {
  const rowHtml = rowMatch[1];
  const rowImgs = rowHtml.match(/<img[^>]+>/gi) || [];
  const textOnly = rowHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  if (rowImgs.length === 0 || textOnly.length > rowImgs.length * 30) continue;

  let rowCellCount = 0;
  const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let tdMatch;
  while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
    const cellHtml = tdMatch[1];
    const cellImgs = cellHtml.match(/<img[^>]+>/gi) || [];
    if (cellImgs.length === 0) continue;

    const cellRibbonUrls = [];
    const deviceUrls = [];

    for (const imgTag of cellImgs) {
      const srcMatch = imgTag.match(/src="([^"]+)"/i);
      if (!srcMatch) continue;
      let src = srcMatch[1];
      if (src.startsWith('//')) src = 'https:' + src;

      const isDeviceImg =
        /ribbonstar|ribbonbar/i.test(src) ||
        (() => {
          const thumbSize = src.match(/\/(\d+)px-/);
          if (thumbSize && parseInt(thumbSize[1]) < 50) return true;
          const w = imgTag.match(/width="(\d+)"/i);
          if (w && parseInt(w[1]) < 50) return true;
          return false;
        })();

      if (isDeviceImg) {
        if (!/spacer|pixel|transparent|icon/i.test(src)) {
          deviceUrls.push(src);
        }
      } else if (isRibbonImage(imgTag, src)) {
        cellRibbonUrls.push(src);
      }
    }

    for (let i = 0; i < cellRibbonUrls.length; i++) {
      cells.push({
        ribbonUrl: cellRibbonUrls[i],
        deviceUrls: i === 0 ? deviceUrls : [],
      });
      rowCellCount++;
    }
  }
  if (rowCellCount > maxPerRow) maxPerRow = rowCellCount;
}

console.log('=== RIBBON RACK CELLS (scraper output) ===');
cells.forEach((c, i) => {
  const fn = decodeURIComponent(c.ribbonUrl.split('/').pop().replace(/^\d+px-/, ''));
  const devFns = c.deviceUrls.map(d => decodeURIComponent(d.split('/').pop().replace(/^\d+px-/, '')));
  console.log(`  ${i+1}. ${fn}${devFns.length > 0 ? ` [devices: ${devFns.join(', ')}]` : ''}`);
});
console.log(`\nTotal ribbon cells: ${cells.length}`);
console.log(`Max per row: ${maxPerRow}`);

// Now simulate parseAwardLines (including no-link fallback)
console.log('\n=== MEDAL NAMES (parseAwardLines simulation) ===');
const medals = [];
const seen = new Set();

const cellContents = [];
const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
let cellMatch;
while ((cellMatch = cellRegex.exec(section)) !== null) {
  cellContents.push(cellMatch[1]);
}

const groups = [];
for (const cellHtml of cellContents) {
  // Skip image-dominant cells
  const cellImgs = cellHtml.match(/<img/gi) || [];
  const cellText = cellHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  if (cellImgs.length > 0 && cellText.length < cellImgs.length * 30) continue;

  const segments = cellHtml
    .replace(/<br\s*\/?>/gi, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length >= 3);

  for (const segment of segments) {
    const plainText = segment.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (plainText.length < 3) continue;
    if (/^\d+(?:st|nd|rd|th)\s+row$/i.test(plainText)) continue;

    const isDevice = /^with\s/i.test(plainText) || /^\(\d/i.test(plainText);
    if (isDevice && groups.length > 0) {
      groups[groups.length - 1].deviceSegments.push(plainText);
    } else {
      groups.push({ segmentHtml: segment, deviceSegments: [] });
    }
  }
}

function isNonMedalLine(line) {
  return (
    line.length < 3 || line.length > 120 ||
    /^\d+$/.test(line) ||
    /\bbadge\b/i.test(line) ||
    /\binsignia\b/i.test(line) ||
    /\btab\b/i.test(line) ||
    /^edit$/i.test(line) ||
    /^\[edit\]$/i.test(line)
  );
}

for (const group of groups) {
  const linkMatch = group.segmentHtml.match(/<a[^>]*>([\s\S]*?)<\/a>/i);
  let medalName;
  if (linkMatch) {
    medalName = linkMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  } else {
    medalName = group.segmentHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  }

  if (isNonMedalLine(medalName)) {
    console.log(`  FILTERED: "${medalName}"`);
    continue;
  }

  const key = medalName.toLowerCase();
  if (seen.has(key)) {
    console.log(`  DEDUPED: "${medalName}"`);
    continue;
  }
  seen.add(key);
  medals.push(medalName);
}

medals.forEach((m, i) => console.log(`  ${i+1}. ${m}`));
console.log(`\nTotal medals: ${medals.length}`);
console.log(`\nDifference: ${cells.length} ribbons - ${medals.length} medals = ${cells.length - medals.length}`);
