const fs = require('fs');
const path = require('path');
const srcDir = path.join(__dirname, '..'); // Assuming it's in src/utils/

const processFile = (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Handle DollarSign -> PhilippinePeso
    if (content.includes('DollarSign') && !filePath.includes('PhilippinePeso.js')) {
        // Find the index of DollarSign import and remove it
        content = content.replace(/,\s*DollarSign/g, '').replace(/\s*/g, '').replace(/{\s*DollarSign\s*}/g, '{}');
        
        // Add PhilippinePeso import if not exists
        if (!content.includes('PhilippinePeso')) {
            const relPathStr = path.relative(path.dirname(filePath), path.join(srcDir, 'components', 'PhilippinePeso'));
            const importPath = relPathStr.startsWith('.') ? relPathStr : './' + relPathStr;
            const importStatement = `import PhilippinePeso from '${importPath}';\n`;
            
            // Insert it after the last lucide-react import
            content = content.replace(/(import .* from ['"]lucide-react['"];?)/, '$1\n' + importStatement);
        }
        // Replace component usage
        content = content.replace(/<PhilippinePeso/g, '<PhilippinePeso');
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated: ' + filePath);
    }
}

function walkDir(dir) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        if (fs.statSync(dirPath).isDirectory()) {
            walkDir(dirPath);
        } else if (dirPath.endsWith('.js')) {
            processFile(dirPath);
        }
    });
}
walkDir(srcDir);
