// Test the scraper against Bud Day's Wikipedia page
async function main() {
  // Dynamically import the scraper (it's TypeScript, use tsx)
  const { execSync } = require('child_process');

  // Run a quick test using the scraper's logic directly on the fetched HTML
  const data = require('./bud_day.json');
  const html = data.parse.text['*'];

  // Simulate isRibbonImage
  function isRibbonImage(imgTag, src) {
    const hasRibbonInName = /ribbon/i.test(src);
    const wMatch = imgTag.match(/width="(\d+)"/i);
    const hMatch = imgTag.match(/height="(\d+)"/i);
    const w = wMatch ? parseInt(wMatch[1]) : 0;
    const h = hMatch ? parseInt(hMatch[1]) : 0;
    const isRibbonShaped = w >= 80 && w <= 150 && h > 0 && w / h > 2.5;
    return hasRibbonInName || isRibbonShaped;
  }

  // Simulate extractRibbonRackCells
  const cells = [];
  let maxPerRow = 0;

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  // Find the ribbon rack table first
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
  let tableMatch;
  let ribbonTableHtml = '';
  while ((tableMatch = tableRegex.exec(html)) !== null) {
    const t = tableMatch[0];
    const imgs = t.match(/<img[^>]*>/gi) || [];
    const ribbonImgs = imgs.filter(img => /ribbon/i.test(img));
    if (ribbonImgs.length > 3) {
      ribbonTableHtml = t;
      break;
    }
  }

  if (!ribbonTableHtml) {
    console.log('No ribbon table found!');
    return;
  }

  let rowNum = 0;
  while ((rowMatch = rowRegex.exec(ribbonTableHtml)) !== null) {
    const rowHtml = rowMatch[1];
    const rowImgs = rowHtml.match(/<img[^>]+>/gi) || [];
    const textOnly = rowHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

    if (rowImgs.length === 0 || textOnly.length > rowImgs.length * 30) {
      rowNum++;
      continue;
    }

    let rowCellCount = 0;
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tdMatch;

    console.log(`\n--- Row ${rowNum} ---`);

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

        const fn = decodeURIComponent(src.split('/').pop().replace(/^\d+px-/, ''));

        if (isDeviceImg) {
          if (!/spacer|pixel|transparent|icon/i.test(src)) {
            deviceUrls.push(src);
            console.log(`  [DEVICE] ${fn}`);
          }
        } else if (isRibbonImage(imgTag, src)) {
          cellRibbonUrls.push(src);
          console.log(`  [RIBBON] ${fn}`);
        } else {
          console.log(`  [SKIP]   ${fn}`);
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
    console.log(`  => ${rowCellCount} ribbons in this row`);
    rowNum++;
  }

  console.log(`\n=== TOTAL: ${cells.length} ribbon cells, maxPerRow: ${maxPerRow} ===`);
}

main().catch(console.error);
