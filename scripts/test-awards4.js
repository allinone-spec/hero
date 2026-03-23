const data = require('./bud_day.json');
const html = data.parse.text['*'];

// Get the "Badges and awards" section content
const sectionStart = html.indexOf('Badges and awards');
const afterSection = html.slice(sectionStart);

// Find the section end (next h2)
const nextH2Match = afterSection.match(/<h2[^>]*>/);
const sectionEnd = nextH2Match ? nextH2Match.index : 5000;
const section = afterSection.slice(0, sectionEnd);

// Strip to plain text, show structure
console.log('=== Section structure (first 2000 chars of HTML) ===');
console.log(section.slice(0, 3000));

console.log('\n=== Plain text ===');
const plainText = section.replace(/<[^>]+>/g, '\n').replace(/\n{2,}/g, '\n').trim();
console.log(plainText.slice(0, 2000));

// Check for table rows with medal text (td cells with links)
const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
let tdMatch;
let tdIdx = 0;
console.log('\n=== TD cells with links ===');
while ((tdMatch = tdRegex.exec(section)) !== null) {
  const cellHtml = tdMatch[1];
  const links = cellHtml.match(/<a[^>]*>([^<]+)<\/a>/g) || [];
  const text = cellHtml.replace(/<[^>]+>/g, '').trim();
  if (links.length > 0 && text.length > 3) {
    const linkTexts = links.map(l => l.replace(/<[^>]+>/g, ''));
    console.log(`  TD ${tdIdx}: links=[${linkTexts.join(', ')}] text="${text.slice(0, 150)}"`);
  }
  tdIdx++;
}
