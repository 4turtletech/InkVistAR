import re
import os

src_dir = "/Users/cpcelis/celis_gitclone/InkVistAR/web-app/src/pages"
files_to_process = [
    "AdminLogin.js", "AdminChat.js", "AdminReviews.js", "AdminStudio.js",
    "AdminCompletedSessions.js", "AdminClients.js", "AdminSettings.js",
    "AdminPOS.js", "AdminNotifications.js", "AdminUsers.js", "AdminBilling.js",
    "AdminStaff.js", "AdminDashboard.js", "AdminInventory.js", "AdminAppointments.js",
    "AdminAnalytics.js"
]

fixed_count = 0

for fname in files_to_process:
    path = os.path.join(src_dir, fname)
    if not os.path.exists(path):
        continue
        
    with open(path, 'r') as f:
        content = f.read()

    # Find elements that have >1 className attribute
    # A naive way is to search line-by-line or tag-by-tag.
    # Since React elements generally start with < and end with >, let's find all tags.
    # Warning: this fails if there are > signs inside strings! 
    
    # Better approach: Just use regex to capture the whole tag and if it has >1 className, merge them!
    
    def replacer(match):
        global fixed_count
        tag_content = match.group(0)
        
        # Check if there are multiple classNames
        class_regex = r'className\s*=\s*(?:\"([^\"]*)\"|\{([^\}]*)\})'
        matches = list(re.finditer(class_regex, tag_content))
        
        if len(matches) > 1:
            # Reconstruct the merged className
            merged_static = []
            merged_dynamic = []
            
            for m in matches:
                # group(1) -> "string"
                # group(2) -> {dynamic}
                if m.group(1) is not None:
                    merged_static.append(m.group(1).strip())
                elif m.group(2) is not None:
                    dyn = m.group(2).strip()
                    if dyn.startswith('`') and dyn.endswith('`'):
                        # `{`btn ${some_var}`}`
                        merged_dynamic.append(dyn[1:-1])
                    else:
                        # `{some_var ? 'a' : 'b'}`
                        merged_dynamic.append(f"${{{dyn}}}")
            
            # Create a unified className
            final_class = ""
            if len(merged_dynamic) > 0:
                inner = " ".join(merged_dynamic + merged_static)
                final_class = f'className={{`{inner}`}}'
            else:
                inner = " ".join(merged_static)
                final_class = f'className="{inner}"'
            
            # Remove all old classNames
            new_tag = tag_content
            for m in matches:
                # Replace with empty string (padded with space to avoid merging adjacent words)
                new_tag = new_tag.replace(m.group(0), "", 1)
                
            # Insert the new final_class just after the tag name
            first_space = new_tag.find(' ')
            if first_space != -1:
                new_tag = new_tag[:first_space] + " " + final_class + new_tag[first_space:]
            else:
                # <divclassName=...
                new_tag = new_tag.replace('>', f' {final_class}>')
                
            # clean up multiple spaces
            new_tag = re.sub(r'\s+', ' ', new_tag)
            # fix /> cases if space got added
            new_tag = new_tag.replace(" />", "/>")
            # preserve original trailing newline/spaces if any? 
            # re.sub(r'<[^>]+>', ...) strips newlines if we replace blindly
            
            fixed_count += 1
            return new_tag
            
        return tag_content

    # Regex to capture HTML/JSX opening tags.
    # Matches < followed by word, then anything until > or />.
    # Excludes </ to avoid closing tags.
    # Allows newlines.
    
    # We must be careful not to match too much.
    # Regex: <[A-Za-z][^>]*>
    content = re.sub(r'<[A-Za-z][^>]*>', replacer, content)

    with open(path, 'w') as f:
        f.write(content)

print(f"Fixed {fixed_count} tags with duplicate classNames!")
