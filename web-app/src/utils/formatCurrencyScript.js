const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..'); // Assuming it's in src/utils/

const processFile = (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Handle DollarSign -> PhilippinePeso
    if (content.includes('DollarSign') && !filePath.includes('PhilippinePeso.js')) {
        // Remove DollarSign from lucide-react import
        content = content.replace(/,\s*DollarSign/g, '').replace(/\s*/g, '');
        // Add PhilippinePeso import if not exists
        if (!content.includes('PhilippinePeso')) {
            // Compute relative path
            const relPathStr = path.relative(path.dirname(filePath), path.join(srcDir, 'components', 'PhilippinePeso'));
            const importPath = relPathStr.startsWith('.') ? relPathStr : './' + relPathStr;
            const importStatement = `import PhilippinePeso from '{formatCurrency(importPath)}';\n`;
            // insert after lucide-react import
            content = content.replace(/(import .* from 'lucide-react';)/, '₱1\n' + importStatement);
        }
        // Replace component usage
        content = content.replace(/<PhilippinePeso/g, '<PhilippinePeso');
    }

    // 2. Handle currency formatting
    // We want to replace {formatCurrency(formatCurrency(something))} with {formatCurrency(formatCurrency(something))}
    let hasCurrencyMatch = false;
    
    // Replace {formatCurrency(formatCurrency(VAR))} -> {formatCurrency(formatCurrency(VAR))}
    const currencyRegex1 = /\$\$\{([^}]+)\}/g;
    if (currencyRegex1.test(content)) {
        hasCurrencyMatch = true;
        content = content.replace(currencyRegex1, '{formatCurrency(formatCurrency(₱1))}');
    }
    
    // Replace {formatCurrency(VAR)} or {formatCurrency(VAR)} not matching the above
    // Example: <span className="price">{formatCurrency(amount)}</span>
    const currencyRegex2 = /\$\s*\{([^}]+)\}/g;
    if (currencyRegex2.test(content)) {
        const newContent = content.replace(currencyRegex2, (match, p1) => {
            // Ignore if it's an object/function body or purely string concatenation like {formatCurrency(...)} without $ prefix.
            // Wait, the regex `\$\s*\{` explicitly catches the literal dollar sign followed by the evaluated bracket.
            // But if it's a template literal like `$\{formatCurrency(p1)}`, it got caught by currencyRegex1. 
            // So this catches JSX text: {formatCurrency(appointment.price)} -> {formatCurrency(appointment.price)}
            hasCurrencyMatch = true;
            return '{formatCurrency(' + p1 + ')}';
        });
        content = newContent;
    }
    
    // Replace hardcoded $<number> -> ₱<number>
    content = content.replace(/\$([0-9]+(?:\.[0-9]+)?)/g, '₱₱1');

    if (hasCurrencyMatch || content !== original) {
        if (hasCurrencyMatch && !content.includes('formatCurrency') && !filePath.includes('formatters.js') && !filePath.includes('ArtistProfile.js')) {
            const relPathStr = path.relative(path.dirname(filePath), path.join(srcDir, 'utils', 'formatters'));
            const importPath = relPathStr.startsWith('.') ? relPathStr : './' + relPathStr;
            const importFormatter = `import { formatCurrency } from '{formatCurrency(importPath)}';\n`;
            content = importFormatter + content;
        }
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
