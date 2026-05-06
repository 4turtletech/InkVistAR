const fs = require('fs');
const path = require('path');
const dir = 'c:/Users/Ella/Desktop/InkVistAR/mobile-app/screens';

fs.readdirSync(dir).filter(f => f.endsWith('.jsx')).forEach(f => {
  const p = path.join(dir, f);
  let c = fs.readFileSync(p, 'utf8');
  if (c.includes('Platform.OS') && !c.match(/import.*\\bPlatform\\b.*from 'react-native'/)) {
    c = c.replace(/import\\s+\\{([^}]*)\\}\\s+from\\s+'react-native';/, (match, p1) => {
      if (!p1.includes('Platform')) {
        return "import { Platform, " + p1.trim() + " } from 'react-native';";
      }
      return match;
    });
    fs.writeFileSync(p, c);
    console.log('Fixed', f);
  }
});
