const data = require('./bud_day.json');
const html = data.parse.text['*'];

// Find award-related headings
const headingRegex = /<h([2-4])[^>]*>([\s\S]*?)<\/h\1>/gi;
let hMatch;
while ((hMatch = headingRegex.exec(html)) !== null) {
  const text = hMatch[2].replace(/<[^>]+>/g, '').trim();
  const level = hMatch[1];
  if (/award|decoration|badge|medal|honour|honor/i.test(text)) {
    console.log(`H${level}: "${text}" at index ${hMatch.index}`);

    // Find next heading of same or higher level
    const afterHeading = html.slice(hMatch.index + hMatch[0].length);
    const nextH = afterHeading.match(new RegExp(`<h[2-${level}][^>]*>`));
    const sectionEnd = nextH ? nextH.index : 3000;
    const section = afterHeading.slice(0, Math.min(sectionEnd, 5000));

    // Check for lists
    const liItems = section.match(/<li[^>]*>[\s\S]*?<\/li>/gi) || [];
    console.log(`  Has ${liItems.length} <li> items`);

    // Check for table-based medal lists
    const tables = section.match(/<table/gi) || [];
    console.log(`  Has ${tables.length} tables`);

    // Show first few li items
    for (let i = 0; i < Math.min(liItems.length, 40); i++) {
      const liText = liItems[i].replace(/<[^>]+>/g, '').trim();
      const aMatch = liItems[i].match(/<a[^>]*>([^<]+)<\/a>/);
      console.log(`  ${i+1}. [${aMatch ? aMatch[1] : 'no-link'}] ${liText.slice(0, 120)}`);
    }
    console.log('');
  }
}
