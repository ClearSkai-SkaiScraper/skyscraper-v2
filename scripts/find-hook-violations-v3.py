#!/usr/bin/env python3
"""
Find REAL React rules-of-hooks violations — focused on the most common pattern:
hooks called after auth guard or loading guard early returns at the component level.

Strategy: look for files that have BOTH:
  1. A pattern like `if (!isLoaded || !isSignedIn) return ...` at component body level
  2. Hook calls (useState, useEffect, etc.) AFTER that guard

Also catches:
  - if (!x) return null; followed by hooks
  - hooks inside conditionals at component body level  
"""
import os
import re
import sys

SRC_DIR = "src"

HOOK_RE = re.compile(r'\b(use[A-Z]\w*)\s*[\(<]')

# Early return guard patterns
GUARD_RETURN_RE = re.compile(
    r'^\s*if\s*\([^)]*\)\s*(?:return\b|{\s*return\b)'
)
SIMPLE_RETURN_RE = re.compile(r'^\s*return\s+[^;]*;?\s*$|^\s*return\s*\(')
CLOSING_GUARD_RE = re.compile(r'^\s*}\s*$')  # closing brace of an if-return block


def find_files(root):
    for dirpath, _, filenames in os.walk(root):
        for fn in filenames:
            if (fn.endswith(".tsx") or fn.endswith(".ts")) and not fn.endswith(".d.ts"):
                yield os.path.join(dirpath, fn)


def find_component_functions(lines):
    """Find line indices where component/hook functions are declared."""
    funcs = []
    for i, line in enumerate(lines):
        s = line.strip()
        # function ComponentName( or export default function ComponentName(
        m = re.match(r'^(?:export\s+)?(?:default\s+)?function\s+([A-Z]\w*|use[A-Z]\w*)\s*[\(<]', s)
        if m:
            funcs.append((i, m.group(1)))
            continue
        # const ComponentName = React.forwardRef(  or  const ComponentName = (
        m = re.match(r'^(?:export\s+)?(?:const|let|var)\s+([A-Z]\w*|use[A-Z]\w*)\s*(?::\s*\w[^=]*)?=', s)
        if m:
            funcs.append((i, m.group(1)))
    return funcs


def analyze_component(lines, func_start, func_name):
    """Analyze a single component/hook function for violations."""
    violations = []
    
    # Find the body of the function (first { that starts a block)
    brace_depth = 0
    body_start = None
    for i in range(func_start, min(func_start + 10, len(lines))):
        for ch in lines[i]:
            if ch == '{':
                brace_depth += 1
                if body_start is None:
                    body_start = i
            elif ch == '}':
                brace_depth -= 1
    
    if body_start is None:
        return violations
    
    # Walk the function body tracking depth
    depth = 0  # will go to 1 when we enter the function body
    in_body = False
    early_returns = []  # (line_index, line_text)
    hook_calls_at_body = []  # (line_index, hook_name, line_text)
    
    for i in range(func_start, len(lines)):
        line = lines[i]
        stripped = line.strip()
        
        # Count braces (rough — skip strings)
        cleaned = re.sub(r'"[^"]*"', '', line)
        cleaned = re.sub(r"'[^']*'", '', cleaned)
        cleaned = re.sub(r'`[^`]*`', '', cleaned)  
        comment_idx = cleaned.find('//')
        if comment_idx >= 0:
            cleaned = cleaned[:comment_idx]
        
        opens = cleaned.count('{')
        closes = cleaned.count('}')
        
        for _ in range(opens):
            depth += 1
            if not in_body and depth >= 1:
                in_body = True
        
        if in_body and depth == 1:
            # We're at the component body level
            
            # Check for early return patterns
            if GUARD_RETURN_RE.match(stripped):
                early_returns.append((i, stripped))
            elif SIMPLE_RETURN_RE.match(stripped) and not stripped.startswith('return ('):
                # Simple return statement at body level — could be early
                early_returns.append((i, stripped))
            
            # Check for hook calls
            m = HOOK_RE.search(stripped)
            if m and not stripped.startswith('//') and not stripped.startswith('*') and not stripped.startswith('/*'):
                hook_calls_at_body.append((i, m.group(1), stripped))
        
        for _ in range(closes):
            depth -= 1
        
        if in_body and depth <= 0:
            break  # End of function
    
    # Now check: are there hook calls AFTER early returns?
    if early_returns and hook_calls_at_body:
        # Find the first early return that has hooks after it
        for ret_idx, ret_text in early_returns:
            hooks_after = [(hi, hn, ht) for hi, hn, ht in hook_calls_at_body if hi > ret_idx]
            if hooks_after:
                # This is a real violation! But first verify it's truly an early return
                # (there must be more code after it at body level)
                for hook_line, hook_name, hook_text in hooks_after:
                    violations.append({
                        'type': 'HOOK_AFTER_EARLY_RETURN',
                        'file': '',  # filled by caller
                        'line': hook_line + 1,
                        'hook': hook_name,
                        'return_line': ret_idx + 1,
                        'func': func_name,
                        'code': hook_text[:150],
                        'guard': ret_text[:100],
                    })
                break  # Only report against the first early return
    
    return violations


def analyze_file(filepath):
    violations = []
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
    except Exception:
        return violations
    
    funcs = find_component_functions(lines)
    
    for func_start, func_name in funcs:
        vs = analyze_component(lines, func_start, func_name)
        for v in vs:
            v['file'] = filepath
        violations.extend(vs)
    
    return violations


def main():
    all_violations = []
    files = sorted(find_files(SRC_DIR))
    print(f"Scanning {len(files)} files...", file=sys.stderr)
    
    for fpath in files:
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
    
    # Group by file for readability
    by_file = {}
    for v in unique:
        by_file.setdefault(v['file'], []).append(v)
    
    total = 0
    file_count = 0
    for filepath in sorted(by_file.keys()):
        items = sorted(by_file[filepath], key=lambda x: x['line'])
        file_count += 1
        
        # Show guard info
        guard = items[0].get('guard', '')
        ret_line = items[0]['return_line']
        print(f"\n{'─'*80}")
        print(f"📄 {filepath}")
        print(f"   Guard: line {ret_line}: {guard}")
        print(f"   Hooks after guard ({len(items)}):")
        for v in items:
            print(f"     L{v['line']:>4}: {v['hook']}  →  {v['code'][:100]}")
            total += 1
    
    print(f"\n{'='*80}")
    print(f"SUMMARY: {total} hook calls after early returns across {file_count} files")
    print(f"{'='*80}")


if __name__ == "__main__":
    main()
