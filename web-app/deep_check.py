import os

src_dir = "/Users/cpcelis/celis_gitclone/InkVistAR/web-app/src/pages"
files = [f for f in os.listdir(src_dir) if f.startswith('Admin') and f.endswith('.js')]

found_any = False

for fname in files:
    path = os.path.join(src_dir, fname)
    with open(path, 'r') as f:
        content = f.read()
    
    # iterate through tags character by character
    i = 0
    while i < len(content):
        if content[i] == '<' and i+1 < len(content) and content[i+1].isalpha():
            # inside a tag
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
                    
                    # check tag_content for duplicate className
                    # count occurrences of className=
                    import re
                    # only outside of text nodes, but we already isolated the tag!
                    matches = re.findall(r'\bclassName\s*=', tag_content)
                    if len(matches) > 1:
                        print(f"DUPLICATE found in {fname}:")
                        print(tag_content.strip())
                        print("-" * 40)
                        found_any = True
                    break
                i += 1
        i += 1

if not found_any:
    print("ALL CLEAN!")
