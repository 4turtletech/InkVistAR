import os
import re
import hashlib

src_dir = "/Users/cpcelis/celis_gitclone/InkVistAR/web-app/src/pages"
files_to_process = [
    "AdminLogin.js", "AdminChat.js", "AdminReviews.js", "AdminStudio.js",
    "AdminCompletedSessions.js", "AdminClients.js", "AdminSettings.js",
    "AdminPOS.js", "AdminNotifications.js", "AdminUsers.js", "AdminBilling.js",
    "AdminStaff.js", "AdminDashboard.js", "AdminInventory.js", "AdminAppointments.js",
    "AdminAnalytics.js"
]

css_file = os.path.join(src_dir, "AdminStyles.css")

existing_hashes = set()

def camel_to_kebab(name):
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1-\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1-\2', s1).lower()

def parse_style(style_str):
    # Reject dynamic things
    if any(char in style_str for char in ['?', '`', '...', '$', '(', ')', ' activeTab', "==="]):
        # Exception for calc(), rgb(), rgba()
        if not re.match(r'^[a-zA-Z0-9\s:\'"_.,#%()-]+$', style_str):
            return None
    
    rules = []
    # simplistic split by comma
    # avoid splitting commas inside rgba() or calc() by manually parsing
    parts = []
    in_paren = 0
    current = ""
    for char in style_str:
        if char == '(': in_paren += 1
        elif char == ')': in_paren -= 1
        elif char == ',' and in_paren == 0:
            parts.append(current)
            current = ""
            continue
        current += char
    if current:
        parts.append(current)
        
    for part in parts:
        part = part.strip()
        if not part: continue
        if ':' not in part: return None
        k, v = part.split(':', 1)
        k = k.strip().strip("'").strip('"')
        v = v.strip().strip("'").strip('"')
        
        # fix numeric values (like flex: 1 => flex: 1) or (padding: 20 => padding: 20px)
        # React implies px for standalone numbers on certain attributes. For simplicity:
        if v.isdigit() and k not in ['opacity', 'zIndex', 'flex', 'fontWeight', 'lineHeight']:
            v = f"{v}px"
            
        rules.append(f"{camel_to_kebab(k)}: {v};")
        
    return rules

new_css_rules = []
styles_replaced = 0

for fname in files_to_process:
    path = os.path.join(src_dir, fname)
    if not os.path.exists(path):
        continue
    
    with open(path, 'r') as f:
        content = f.read()

    # regex find className="..." style={{...}}
    # OR style={{...}}
    
    # Wait, regex is greedy. Let's do a procedural replacement.
    def replacer(match):
        global styles_replaced
        full_match = match.group(0)
        class_attr = match.group(1) # might be None
        style_content = match.group(2)
        
        rules = parse_style(style_content)
        if not rules:
            return full_match # skip dynamic

        rules_str = "\n    ".join(rules)
        hash_str = hashlib.md5(rules_str.encode('utf-8')).hexdigest()[:8]
        cls_name = f"admin-st-{hash_str}"
        
        if cls_name not in existing_hashes:
            existing_hashes.add(cls_name)
            new_css_rules.append(f".{cls_name} {{\n    {rules_str}\n}}")
            
        styles_replaced += 1
        
        if class_attr:
            # It already had a className, append to it
            return f'className="{class_attr} {cls_name}"'
        else:
            return f'className="{cls_name}"'
            
    # Pattern to match className="..." style={{...}}
    # Warning: this fails if there is a newline between className and style.
    p1 = r'className="([^"]+)"\s*style=\{\{\s*(.*?)\s*\}\}'
    content = re.sub(p1, replacer, content, flags=re.DOTALL)
    
    # Pattern to match style={{...}} empty or missing className. 
    # Use a generic matcher now that the className adjacent ones are dealt with!
    def replacer2(match):
        global styles_replaced
        full_match = match.group(0)
        style_content = match.group(1)
        
        rules = parse_style(style_content)
        if not rules: return full_match
        
        rules_str = "\n    ".join(rules)
        hash_str = hashlib.md5(rules_str.encode('utf-8')).hexdigest()[:8]
        cls_name = f"admin-st-{hash_str}"
        
        if cls_name not in existing_hashes:
            existing_hashes.add(cls_name)
            new_css_rules.append(f".{cls_name} {{\n    {rules_str}\n}}")
            
        styles_replaced += 1
        return f'className="{cls_name}"'
        
    p2 = r'style=\{\{\s*(.*?)\s*\}\}'
    content = re.sub(p2, replacer2, content, flags=re.DOTALL)

    with open(path, 'w') as f:
        f.write(content)

with open(css_file, 'a') as f:
    if new_css_rules:
        f.write("\n\n/* Auto-Extracted Styles */\n")
        f.write("\n\n".join(new_css_rules))

print(f"Extraction complete! Replaced {styles_replaced} inline style instances.")
