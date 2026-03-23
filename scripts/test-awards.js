// Analyze the awards section text parsing for Bud Day
const data = require('./bud_day.json');
const html = data.parse.text['*'];

// Find the "Awards and decorations" or "Military awards" section
// Look for h2/h3 headers followed by award content
const sectionRegex = /<h[23][^>]*>[\s\S]*?(?:award|decoration|medal|honor)[\s\S]*?<\/h[23]>/gi;
let sectionMatch;
const sectionHeaders = [];
while ((sectionMatch = sectionRegex.exec(html)) !== null) {
  const headerText = sectionMatch[0].replace(/<[^>]+>/g, '').trim();
  sectionHeaders.push({ text: headerText, index: sectionMatch.index });
}
console.log('Award-related section headers:', sectionHeaders.map(s => s.text));

// Find lists (ul/li) after the awards section header
// Look for all <li> items that contain links (likely medal names)
const awardsStart = html.indexOf('Military awards');
if (awardsStart === -1) {
  console.log('No "Military awards" section found, trying alternatives...');
}

// Find all <li> items in the awards section area
const awardsSectionHtml = html.slice(awardsStart > 0 ? awardsStart : 0);
const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
let liMatch;
let medalCount = 0;
const medals = [];

// Only scan until the next h2
const nextH2 = awardsSectionHtml.indexOf('<h2', 50);
const awardsOnly = nextH2 > 0 ? awardsSectionHtml.slice(0, nextH2) : awardsSectionHtml.slice(0, 5000);

while ((liMatch = liRegex.exec(awardsOnly)) !== null) {
  const liHtml = liMatch[1];
  const text = liHtml.replace(/<[^>]+>/g, '').trim();
  // Extract first <a> tag text
  const aMatch = liHtml.match(/<a[^>]*>([^<]+)<\/a>/);
  const firstLink = aMatch ? aMatch[1].trim() : '';

  if (text.length > 3 && text.length < 200) {
    medalCount++;
    medals.push({ firstLink, fullText: text.slice(0, 120) });
    console.log(`  ${medalCount}. [${firstLink}] => "${text.slice(0, 120)}"`);
  }
}

console.log(`\nTotal medal lines: ${medalCount}`);

// Also check for <td> based award lists
const tdAwardRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
let tdMatch;
let tdMedalCount = 0;

// Look for award text cells in tables after awards header
const awardTableHtml = html.slice(awardsStart > 0 ? awardsStart : 0, awardsStart + 10000);
while ((tdMatch = tdAwardRegex.exec(awardTableHtml)) !== null) {
  const cellHtml = tdMatch[1];
  const aMatch = cellHtml.match(/<a[^>]*>([^<]+)<\/a>/);
  if (aMatch && aMatch[1].length > 5) {
    const text = cellHtml.replace(/<[^>]+>/g, '').trim();
    if (text.length > 5 && text.length < 200 && !/^\d+$/.test(text)) {
      tdMedalCount++;
      // Only show first 50 to keep output manageable
      if (tdMedalCount <= 50) {
        console.log(`  TD ${tdMedalCount}. [${aMatch[1]}] => "${text.slice(0, 120)}"`);
      }
    }
  }
}
if (tdMedalCount > 0) {
  console.log(`\nTotal TD medal cells: ${tdMedalCount}`);
}
