const fs = require('fs');
const path = require('path');

const srcDir = './src';
const affectedFiles = [];

function scanDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            scanDir(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('<input') || content.includes('<textarea') || content.includes('<select')) {
                // Not a strict parser, but checks if there's error messaging near inputs
                const hasValidationState = content.includes('setErrors') || content.includes('errors.') || (content.includes('error') && content.includes('<small'));
                const hasOnChange = content.includes('onChange=');
                
                if (!hasValidationState) {
                    affectedFiles.push(fullPath);
                }
            }
        }
    }
}

scanDir(srcDir);
console.log(affectedFiles.join('\n'));
