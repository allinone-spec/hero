const data = require('./bud_day.json');
const html = data.parse.text['*'];

// Find all tables
const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
let match;
let tableIdx = 0;
while ((match = tableRegex.exec(html)) !== null) {
  const t = match[0];
  const imgMatches = t.match(/<img[^>]*>/gi) || [];
  const ribbonImgs = imgMatches.filter(img => /ribbon/i.test(img));
  if (ribbonImgs.length > 3) {
    console.log('=== Table', tableIdx, '- has', ribbonImgs.length, 'ribbon images ===');
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch;
    let rowNum = 0;
    while ((rowMatch = rowRegex.exec(t)) !== null) {
      const rowHtml = rowMatch[1];
      const tds = rowHtml.match(/<td[^>]*>[\s\S]*?<\/td>/gi) || [];
      const rowImgs = rowHtml.match(/<img[^>]*>/gi) || [];
      const ribbonCount = rowImgs.filter(img => /ribbon/i.test(img)).length;
      if (ribbonCount > 0) {
        console.log('  Row', rowNum, ':', tds.length, 'cells,', ribbonCount, 'ribbon imgs');
        for (const img of rowImgs) {
          const srcMatch = img.match(/src="([^"]+)"/);
          const wMatch = img.match(/width="(\d+)"/);
          const hMatch = img.match(/height="(\d+)"/);
          if (srcMatch) {
            const parts = srcMatch[1].split('/');
            const fn = decodeURIComponent(parts[parts.length - 1]);
            const isRibbon = /ribbon/i.test(fn);
            console.log('    ', isRibbon ? '[R]' : '[D]', fn, wMatch ? wMatch[1] + 'x' + (hMatch ? hMatch[1] : '?') : '');
          }
        }
      }
      rowNum++;
    }
  }
  tableIdx++;
}
