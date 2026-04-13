const fs = require('fs');
const glob = require('glob');

const files = [
  ...glob.sync('mobile-app/screens/Admin*.jsx'),
  'mobile-app/screens/CustomerTransactions.jsx',
  'mobile-app/screens/CustomerReview.jsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Backgrounds
  content = content.replace(/#111827/g, '#f9fafb');
  content = content.replace(/#1f2937/g, '#ffffff');
  content = content.replace(/#374151/g, '#f3f4f6');
  
  // Text colors
  content = content.replace(/(color:\s*)(['"])white\2/g, '#111827');
  content = content.replace(/(color:\s*)(['"])#fff\2/g, '#111827');
  content = content.replace(/(color:\s*)(['"])#ffffff\2/gi, '#111827');
  
  // Subtle text colors
  content = content.replace(/#9ca3af/g, '#6b7280');
  content = content.replace(/#d1d5db/g, '#4b5563');
  content = content.replace(/#e5e7eb/g, '#374151');
  
  fs.writeFileSync(file, content);
  console.log('Updated ' + file);
});
