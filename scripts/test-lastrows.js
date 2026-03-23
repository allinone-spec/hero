const data = require('./bud_day.json');
const html = data.parse.text['*'];

const sectionStart = html.indexOf('Badges and awards');
const afterSection = html.slice(sectionStart);
const nextH2Match = afterSection.match(/<h2[^>]*>/);
const sectionEnd = nextH2Match ? nextH2Match.index : 5000;
const section = afterSection.slice(0, sectionEnd);

// Show last 3 rows of the ribbon rack table
const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
let rowMatch;
const rows = [];
while ((rowMatch = rowRegex.exec(section)) !== null) {
  rows.push(rowMatch[0]);
}

// Show last 4 rows
console.log('=== Last 4 rows of ribbon table ===');
for (let i = Math.max(0, rows.length - 4); i < rows.length; i++) {
  console.log(`\n--- Row ${i} ---`);
  const text = rows[i].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  console.log(`Text: ${text.slice(0, 300)}`);

  // Show TD structure
  const tdRegex2 = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  let tdMatch2;
  let tdIdx = 0;
  while ((tdMatch2 = tdRegex2.exec(rows[i])) !== null) {
    const cellText = tdMatch2[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    const links = tdMatch2[1].match(/<a[^>]*>([^<]+)<\/a>/g) || [];
    const imgs = tdMatch2[1].match(/<img[^>]+>/gi) || [];
    console.log(`  TD ${tdIdx}: ${imgs.length} imgs, links=[${links.map(l => l.replace(/<[^>]+>/g,'')).join(', ')}], text="${cellText.slice(0,80)}"`);
    tdIdx++;
  }
}

// Also show content AFTER the table (might have the Medal of Valor text)
const tableEnd = section.lastIndexOf('</table>');
if (tableEnd > 0) {
  const afterTable = section.slice(tableEnd + 8).trim();
  console.log('\n=== Content AFTER ribbon table ===');
  console.log(afterTable.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500));
}
