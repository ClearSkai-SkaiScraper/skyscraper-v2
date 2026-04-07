#!/usr/bin/env python3
"""
Find REAL React rules-of-hooks violations:
  - Hooks called after early returns in component/hook function bodies
  - Hooks called inside conditionals
  
This version tracks brace depth to avoid false positives from returns 
inside nested callbacks/functions.
"""
import os
import re
import sys

SRC_DIR = "src"

HOOK_CALL_RE = re.compile(r'\b(use[A-Z]\w*)\s*[\(<]')

def find_files(root):
    for dirpath, _, filenames in os.walk(root):
        for fn in filenames:
            if (fn.endswith(".tsx") or fn.endswith(".ts")) and not fn.endswith(".d.ts"):
                yield os.path.join(dirpath, fn)


def is_component_or_hook_decl(line):
    """Return function name if line declares a React component or custom hook."""
    s = line.strip()
    # export default function FooPage(
    m = re.match(r'^(?:export\s+)?(?:default\s+)?function\s+([A-Z]\w*|use[A-Z]\w*)\s*[\(<]', s)
    if m:
        return m.group(1)
    # const FooPage = ... forwardRef / memo / React.forwardRef
    m = re.match(r'^(?:export\s+)?(?:const|let|var)\s+([A-Z]\w*|use[A-Z]\w*)\s*[:=]', s)
    if m:
        return m.group(1)
    return None


def count_braces(line):
    """Count net braces, ignoring those in strings/comments (simple heuristic)."""
    # Remove string literals (very rough)
    cleaned = re.sub(r'"[^"]*"', '', line)
    cleaned = re.sub(r"'[^']*'", '', cleaned)
    cleaned = re.sub(r'`[^`]*`', '', cleaned)
    # Remove // comments
    idx = cleaned.find('//')
    if idx >= 0:
        cleaned = cleaned[:idx]
    return cleaned.count('{') - cleaned.count('}')


def analyze_file(filepath):
    violations = []
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
    except Exception:
        return violations

    # Pass 1: Find all component/hook function bodies
    # We'll track each function and its brace depth
    i = 0
    while i < len(lines):
        func_name = is_component_or_hook_decl(lines[i])
        if func_name is None:
            i += 1
            continue

        # Found a component/hook declaration
        func_start = i
        # Find the opening brace of the function body
        brace_depth = 0
        found_body = False
        j = i
        while j < len(lines):
            brace_depth += count_braces(lines[j])
            if brace_depth > 0:
                found_body = True
                break
            j += 1

        if not found_body:
            i += 1
            continue

        # Now walk the function body tracking brace depth relative to function body
        # brace_depth starts at what we counted to get into the body
        # "component level" is when depth == 1 (inside the outermost braces of the function)
        body_start = j
        depth = brace_depth
        early_return_line = None
        has_hooks_after_return = False

        for k in range(j + 1, len(lines)):
            line = lines[k]
            stripped = line.strip()
            
            net = count_braces(line)
            
            # Before updating depth, check current depth
            current_depth_before = depth
            
            # Check if this line at component level (depth == 1) has an early return
            # depth==1 means we're in the component function body, not in a nested function/callback
            if depth == 1 and early_return_line is None:
                if re.match(r'^return\b', stripped) or re.match(r'^return\s*[\(<]', stripped) or stripped == 'return;':
                    # This is a return at component level. 
                    # Check if there are more lines after this at depth 1 (making it an early return)
                    early_return_line = k

            # Check for hooks after early return at component level
            if early_return_line is not None and k > early_return_line and depth == 1:
                m = HOOK_CALL_RE.search(stripped)
                if m and not stripped.startswith('//') and not stripped.startswith('*'):
                    hook_name = m.group(1)
                    violations.append({
                        'type': 'HOOK_AFTER_EARLY_RETURN',
                        'file': filepath,
                        'line': k + 1,
                        'hook': hook_name,
                        'return_line': early_return_line + 1,
                        'func': func_name,
                        'code': stripped[:150],
                    })
                    has_hooks_after_return = True

            depth += net
            
            if depth <= 0:
                # End of function
                break

        # Move past this function
        i = func_start + 1

    # Pass 2: Find hooks inside conditionals at component level
    i = 0
    while i < len(lines):
        func_name = is_component_or_hook_decl(lines[i])
        if func_name is None:
            i += 1
            continue

        func_start = i
        brace_depth = 0
        found_body = False
        j = i
        while j < len(lines):
            brace_depth += count_braces(lines[j])
            if brace_depth > 0:
                found_body = True
                break
            j += 1

        if not found_body:
            i += 1
            continue

        depth = brace_depth
        for k in range(j + 1, len(lines)):
            line = lines[k]
            stripped = line.strip()
            
            # At component level (depth 1), check for if/for/while/switch
            if depth == 1:
                cond_match = re.match(r'^(if|else\s*if|else|for|while|switch)\s*[\({]', stripped)
                if cond_match or stripped == 'else {':
                    cond_keyword = cond_match.group(1) if cond_match else 'else'
                    cond_line = k
                    # Scan inside the conditional block for hook calls
                    inner_depth = count_braces(lines[k])
                    for m_idx in range(k + 1, min(k + 30, len(lines))):
                        inner_line = lines[m_idx].strip()
                        inner_depth += count_braces(lines[m_idx])
                        
                        hook_m = HOOK_CALL_RE.search(inner_line)
                        if hook_m and not inner_line.startswith('//') and not inner_line.startswith('*'):
                            violations.append({
                                'type': 'CONDITIONAL_HOOK',
                                'file': filepath,
                                'line': m_idx + 1,
                                'hook': hook_m.group(1),
                                'return_line': cond_line + 1,
                                'func': func_name,
                                'code': inner_line[:150],
                            })
                        
                        if inner_depth <= 0:
                            break

            depth += count_braces(line)
            if depth <= 0:
                break

        i = func_start + 1

    return violations


def main():
    all_violations = []
    files = list(find_files(SRC_DIR))
    print(f"Scanning {len(files)} files...", file=sys.stderr)

    for fpath in sorted(files):
        vs = analyze_file(fpath)
        all_violations.extend(vs)

    # Deduplicate
    seen = set()
    unique = []
    for v in all_violations:
        key = (v['type'], v['file'], v['line'])
        if key not in seen:
            seen.add(key)
            unique.append(v)

    # Group by type
    by_type = {}
    for v in unique:
        by_type.setdefault(v['type'], []).append(v)

    for vtype in ['HOOK_AFTER_EARLY_RETURN', 'CONDITIONAL_HOOK']:
        items = by_type.get(vtype, [])
        if not items:
            continue
        print(f"\n{'='*80}")
        print(f"  {vtype} ({len(items)} found)")
        print(f"{'='*80}")
        for v in sorted(items, key=lambda x: (x['file'], x['line'])):
            print(f"\n  {v['file']}:{v['line']}  (in {v['func']})")
            if vtype == 'HOOK_AFTER_EARLY_RETURN':
                print(f"    ⚠ Hook `{v['hook']}` called AFTER early return on line {v['return_line']}")
            else:
                print(f"    ⚠ Hook `{v['hook']}` called inside conditional on line {v['return_line']}")
            print(f"    Code: {v['code']}")

    print(f"\n{'='*80}")
    print(f"TOTAL potential violations: {len(unique)}")
    for vtype in ['HOOK_AFTER_EARLY_RETURN', 'CONDITIONAL_HOOK']:
        items = by_type.get(vtype, [])
        if items:
            print(f"  {vtype}: {len(items)}")


if __name__ == "__main__":
    main()
