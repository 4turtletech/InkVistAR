import csv
import json

lines = []
with open('/Users/cpcelis/celis_gitclone/InkVistAR/guidelines.md', 'r') as f:
    capture = False
    for line in f:
        line = line.strip()
        if line == 'Country,ISO Country Codes,Country Code':
            capture = True
            continue
        if capture:
            if not line:
                continue
            if line.startswith('##') or line.startswith('|'):
                break
            lines.append(line)

countries = []
for line in lines:
    import builtins
    # We can use the csv module properly since some codes have quotes like "1 787, 1939 "
    import io
    reader = csv.reader(io.StringIO(line))
    for row in reader:
        if len(row) >= 3:
            country = row[0].strip()
            code_part = row[2].strip()
            
            # code_part might be something like '"1 809, 1 829, 1 849 "' or '1 684 '
            # Take the first one if multiple are specified.
            if ',' in code_part:
                codes_to_process = [c.strip() for c in code_part.split(',')]
            else:
                codes_to_process = [code_part]
                
            for c_dirty in codes_to_process:
                # Remove spaces and get the numeric code
                c_clean = c_dirty.replace(' ', '').replace('+', '')
                
                # Check for duplicates
                if c_clean and not any(c['code'] == f'+{c_clean}' for c in countries):
                    countries.append({
                        'country': country,
                        'code': f'+{c_clean}'
                    })

# Sort countries alphabetically by name
countries.sort(key=lambda x: x['country'])

# Generate JS file
js_content = "export const COUNTRY_CODES = " + json.dumps(countries, indent=4) + ";\n"
js_content += """
export const getPhoneParts = (fullPhone) => {
    if (!fullPhone) return { code: '+63', currentNo: '' };
    
    // Sort codes by length descending to match longest prefix first (e.g. +1876 vs +1)
    const sortedCodes = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
    
    const matchedCode = sortedCodes.find(c => fullPhone.startsWith(c.code))?.code || '+63';
    const currentNo = fullPhone.startsWith(matchedCode) 
        ? fullPhone.substring(matchedCode.length) 
        : fullPhone;
        
    return { code: matchedCode, currentNo };
};
"""

with open('/Users/cpcelis/celis_gitclone/InkVistAR/web-app/src/constants/countryCodes.js', 'w') as f:
    f.write(js_content)
print("Generated src/constants/countryCodes.js")
