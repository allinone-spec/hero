const data = require('./bud_day.json');
const html = data.parse.text['*'];

const sectionStart = html.indexOf('Badges and awards');
const afterSection = html.slice(sectionStart);
const nextH2Match = afterSection.match(/<h2[^>]*>/);
const sectionEnd = nextH2Match ? nextH2Match.index : 5000;
const section = afterSection.slice(0, sectionEnd);

// Show ALL rows with classification
const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
let rowMatch;
let rowIdx = 0;
while ((rowMatch = rowRegex.exec(section)) !== null) {
  const rowHtml = rowMatch[1];
  const imgs = rowHtml.match(/<img[^>]+>/gi) || [];
  const text = rowHtml.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const hasRibbonImgs = imgs.some(img => {
    const src = img.match(/src="([^"]+)"/i);
    if (!src) return false;
    const wMatch = img.match(/width="(\d+)"/i);
    const hMatch = img.match(/height="(\d+)"/i);
    const w = wMatch ? parseInt(wMatch[1]) : 0;
    const h = hMatch ? parseInt(hMatch[1]) : 0;
    return /ribbon/i.test(src[1]) || (w >= 80 && w <= 150 && h > 0 && w/h > 2.5);
  });

  const isImageDominant = imgs.length > 0 && text.length <= imgs.length * 30;
  const type = isImageDominant ? (hasRibbonImgs ? 'RIBBON-ROW' : 'BADGE-ROW') : 'TEXT-ROW';

  console.log(`Row ${rowIdx} [${type}]: ${imgs.length} imgs, text="${text.slice(0, 100)}"`);
  rowIdx++;
}
