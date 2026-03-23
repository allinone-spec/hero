// Find the exact awards cell content for Bud Day
const data = require('./bud_day.json');
const html = data.parse.text['*'];

// Find the infobox
const infoboxMatch = html.match(/<table[^>]*class="[^"]*infobox[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
if (!infoboxMatch) {
  console.log('No infobox found');
  process.exit(1);
}

const infobox = infoboxMatch[0];
console.log('Infobox found, length:', infobox.length);

// Find award-related rows
const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
let trMatch;
let rowIdx = 0;
while ((trMatch = trRegex.exec(infobox)) !== null) {
  const rowHtml = trMatch[1];
  const text = rowHtml.replace(/<[^>]+>/g, '').trim();

  // Look for rows containing "Medal of Honor" or "award" as a label
  if (/award|decoration|medal of honor|silver star/i.test(text) && text.length > 20) {
    console.log(`\n=== Row ${rowIdx} ===`);

    // Find all <td> cells
    const tdRegex2 = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tdMatch2;
    while ((tdMatch2 = tdRegex2.exec(rowHtml)) !== null) {
      const cellHtml = tdMatch2[1];
      const cellText = cellHtml.replace(/<[^>]+>/g, '').trim();
      if (cellText.length > 20) {
        console.log('\n--- Cell content (first 500 chars) ---');
        console.log(cellHtml.slice(0, 1500));
        console.log('\n--- Plain text ---');
        console.log(cellText.slice(0, 1000));
      }
    }
  }
  rowIdx++;
}
