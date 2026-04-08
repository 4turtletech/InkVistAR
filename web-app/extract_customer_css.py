import os
import re
import hashlib
import json

src_dir = "/Users/cpcelis/celis_gitclone/InkVistAR/web-app/src/pages"
files = [f for f in os.listdir(src_dir) if f.startswith('Customer') and f.endswith('.js')]

extracted_css = []
seen_classes = set()

def js_to_css(js_obj_str):
    """Convert a JS style object string into CSS string."""
    try:
        # Simple extraction for standard { key: 'value', key2: value }
        # This regex matches key: value or 'key': "value"
        pairs = re.findall(r'([a-zA-Z0-9_]+)\s*:\s*([^,]+)(?:,|$)', js_obj_str)
        
        css_rules = []
        for key, value in pairs:
            # Convert camelCase to kebab-case
            css_key = re.sub(r'([a-z0-9])([A-Z])', r'\1-\2', key).lower()
            
            # Clean value
            value = value.strip()
            # If value is purely a string 'something' or "something", stripe quotes
            if value.startswith("'") and value.endswith("'") or value.startswith('"') and value.endswith('"'):
                val = value[1:-1]
            elif '`' in value:
                # Value has template literals, this means it's dynamic.
                # We can't perfectly extract dynamic styles into static CSS.
                # Skip extraction for highly dynamic properties.
                return None
            else:
                # E.g. 20, false, variables. Best effort to keep if not a variable.
                if not re.match(r'^[\d\.]+px$|^[\d\.]+$|^boolean$|^#[\w]+$', value):
                     # Likely a variable, skip extracting this entire style block safely.
                     return None
                val = value
            css_rules.append(f"    {css_key}: {val};")
        
        if not css_rules:
            return None
        return "\n".join(css_rules)
    except Exception as e:
        return None

def process_tag(tag_content):
    global extracted_css, seen_classes
    
    # 1. Look for style={{...}}
    style_regex = r'style=\{\{\s*([\s\S]*?)\s*\}\}'
    style_match = re.search(style_regex, tag_content)
    
    if not style_match:
        return tag_content
    
    style_content = style_match.group(1)
    
    # Check if style is safely extractable
    css_body = js_to_css(style_content)
    if not css_body:
        return tag_content # Skip dynamic styles
        
    # Create hash
    hash_str = hashlib.md5(css_body.encode()).hexdigest()[:8]
    class_name = f"customer-st-{hash_str}"
    
    if class_name not in seen_classes:
        seen_classes.add(class_name)
        extracted_css.append(f".{class_name} {{\n{css_body}\n}}")
        
    # Remove style attribute
    new_tag = tag_content[:style_match.start()] + tag_content[style_match.end():]
    
    # Merge class_name into the tag
    class_regex = r'className\s*=\s*(?:\"([^\"]*)\"|\{([^\}]*)\})'
    class_matches = list(re.finditer(class_regex, new_tag))
    
    if len(class_matches) > 0:
        # Merge into existing classes
        merged_static = []
        merged_dynamic = []
        
        for m in class_matches:
            if m.group(1) is not None:
                merged_static.append(m.group(1).strip())
            elif m.group(2) is not None:
                dyn = m.group(2).strip()
                if dyn.startswith('`') and dyn.endswith('`'):
                    merged_dynamic.append(dyn[1:-1])
                else:
                    merged_dynamic.append(f"${{{dyn}}}")
        
        merged_static.append(class_name)
        
        final_class = ""
        if len(merged_dynamic) > 0:
            inner = " ".join(merged_dynamic + merged_static)
            final_class = f'className={{`{inner}`}}'
        else:
            inner = " ".join(merged_static)
            final_class = f'className="{inner}"'
            
        # Remove old classes
        for m in class_matches:
            new_tag = new_tag.replace(m.group(0), "", 1)
            
        # Insert
        first_space = new_tag.find(' ')
        new_tag = new_tag[:first_space] + " " + final_class + new_tag[first_space:]
    else:
        # Insert new
        first_space = new_tag.find(' ')
        new_tag = new_tag[:first_space] + f' className="{class_name}"' + new_tag[first_space:]
        
    new_tag = new_tag.replace(" />", "/>")
    new_tag = re.sub(r'\s{2,}', ' ', new_tag) # cleanup spaces
    
    return new_tag

def parse_file(path):
    with open(path, 'r') as f:
        content = f.read()
    
    new_content = ""
    i = 0
    modified = False
    
    while i < len(content):
        if content[i] == '<' and i+1 < len(content) and content[i+1].isalpha():
            tag_start = i
            in_string = False
            string_char = ''
            in_braces = 0
            
            while i < len(content):
                if in_string:
                    if content[i] == string_char and content[i-1] != '\\':
                        in_string = False
                elif content[i] in ['"', "'", '`']:
                    in_string = True
                    string_char = content[i]
                elif content[i] == '{':
                    in_braces += 1
                elif content[i] == '}':
                    in_braces -= 1
                elif content[i] == '>' and not in_string and in_braces == 0:
                    tag_end = i
                    tag_content = content[tag_start:tag_end+1]
                    
                    processed_tag = process_tag(tag_content)
                    if processed_tag != tag_content:
                        content = content[:tag_start] + processed_tag + content[tag_end+1:]
                        # Adjust index
                        i = tag_start + len(processed_tag) - 1
                        modified = True
                        
                    break
                i += 1
        i += 1
        
    if modified:
        # Check if import is there
        if "import './CustomerStyles.css';" not in content:
            # Add to imports
            match = re.search(r'import\s+.*?;', content)
            if match:
                content = content[:match.start()] + "import './CustomerStyles.css';\n" + content[match.start():]
        with open(path, 'w') as f:
            f.write(content)
        print(f"Processed: {os.path.basename(path)}")
        return True
    return False

modified_files = 0
for fname in files:
    path = os.path.join(src_dir, fname)
    if parse_file(path):
        modified_files += 1

if extracted_css:
    css_path = os.path.join(src_dir, 'CustomerStyles.css')
    css_content = "/* Auto-extracted Customer UI Styles */\n\n"
    css_content += "\n\n".join(extracted_css)
    with open(css_path, 'w') as f:
        f.write(css_content)
    print(f"Extraction created {len(extracted_css)} CSS rules in CustomerStyles.css")

print(f"Updated {modified_files} files.")
