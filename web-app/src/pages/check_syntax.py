
def check_brackets(filename):
    with open(filename, 'r') as f:
        content = f.read()
    
    stack = []
    brackets = {'(': ')', '{': '}', '[': ']'}
    
    for i, char in enumerate(content):
        if char in brackets.keys():
            stack.append((char, i))
        elif char in brackets.values():
            if not stack:
                print(f"Extra closing bracket {char} at index {i}")
                return
            top, pos = stack.pop()
            if brackets[top] != char:
                print(f"Mismatch: {top} at {pos} closed by {char} at {i}")
                return
    
    if stack:
        for char, pos in stack:
            print(f"Unclosed bracket {char} at index {pos}")
    else:
        print("All brackets balanced!")

import sys
check_brackets(sys.argv[1])
