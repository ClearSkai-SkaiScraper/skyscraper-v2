#!/usr/bin/env python3
"""Find potential React rules-of-hooks violations in .tsx/.ts files."""
import os
import re
import sys

SRC_DIR = "src"
HOOK_RE = re.compile(r'\buse[A-Z]\w*\s*\(')
# Standard React hooks + common custom hooks
HOOK_NAMES = re.compile(
    r'\b(useState|useEffect|useCallback|useMemo|useRef|useReducer|useContext|'
    r'useLayoutEffect|useImperativeHandle|useDebugValue|useDeferredValue|'
    r'useTransition|useId|useSyncExternalStore|useInsertionEffect|'
    r'useRouter|usePathname|useSearchParams|useParams|'
    r'useAuth|useUser|useOrganization|useClerk|useSession|useSignIn|useSignUp|'
    r'useForm|useFormContext|useFieldArray|useWatch|useController|'
    r'useQuery|useMutation|useInfiniteQuery|'
    r'useToast|useTheme|useMediaQuery|'
    r'use[A-Z]\w*)\s*\('
)

def find_files(root):
    """Walk src/ and yield all .tsx and .ts files (not .d.ts)."""
    for dirpath, _, filenames in os.walk(root):
        for fn in filenames:
            if (fn.endswith(".tsx") or fn.endswith(".ts")) and not fn.endswith(".d.ts"):
                yield os.path.join(dirpath, fn)

def is_hook_call(line_text):
    """Check if line contains a React hook call."""
    stripped = line_text.strip()
    if stripped.startswith("//") or stripped.startswith("*") or stripped.startswith("/*"):
        return False, None
    m = HOOK_NAMES.search(stripped)
    if m:
        return True, m.group(1)
    return False, None

def is_component_or_hook_function(line_text):
    """Check if line declares a React component or custom hook function."""
    stripped = line_text.strip()
    # function ComponentName( or function useHookName(
    if re.match(r'^(export\s+)?(default\s+)?function\s+([A-Z]|use[A-Z])\w*\s*[\(<]', stripped):
        return True
    # const ComponentName = ... => { or ( 
    if re.match(r'^(export\s+)?(const|let|var)\s+([A-Z]|use[A-Z])\w*\s*[:=]', stripped):
        return True
    return False

def analyze_file(filepath):
    """Analyze a single file for hooks violations."""
    violations = []
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()
    except Exception:
        return violations

    # --- Pattern 1: Hooks inside conditionals/loops ---
    for i, line in enumerate(lines):
        stripped = line.strip()
        # Check if this line is a conditional/loop
        if re.match(r'^(if|else\s+if|else|for|while|switch)\s*[\({]', stripped) or stripped == "else {":
            if_indent = len(line) - len(line.lstrip())
            # Scan next lines inside the block
            brace_count = stripped.count("{") - stripped.count("}")
            for j in range(i + 1, min(i + 20, len(lines))):
                inner = lines[j]
                inner_stripped = inner.strip()
                inner_indent = len(inner) - len(inner.lstrip())
                
                brace_count += inner_stripped.count("{") - inner_stripped.count("}")
                
                if brace_count <= 0 and inner_stripped.startswith("}"):
                    break
                
                if inner_indent > if_indent:
                    is_hook, hook_name = is_hook_call(inner_stripped)
                    if is_hook:
                        violations.append({
                            "type": "CONDITIONAL_HOOK",
                            "file": filepath,
                            "line": j + 1,
                            "hook": hook_name,
                            "detail": f"Hook `{hook_name}` called inside `{stripped.split('(')[0].split('{')[0].strip()}` block (line {i+1})",
                            "code": inner_stripped[:120],
                        })

    # --- Pattern 2: Hooks after early returns ---
    # Find component/hook function boundaries
    func_ranges = []
    for i, line in enumerate(lines):
        if is_component_or_hook_function(line):
            indent = len(line) - len(line.lstrip())
            func_ranges.append((i, indent))

    for func_start, func_indent in func_ranges:
        seen_return = False
        return_line = -1
        brace_depth = 0
        started = False
        for i in range(func_start, len(lines)):
            stripped = lines[i].strip()
            if "{" in stripped:
                brace_depth += stripped.count("{")
                started = True
            if "}" in stripped:
                brace_depth -= stripped.count("}")
            if started and brace_depth <= 0:
                break  # End of function

            line_indent = len(lines[i]) - len(lines[i].lstrip())
            
            # Look for early returns (returns that aren't the final return)
            if (stripped.startswith("return ") or stripped == "return;" or stripped.startswith("return(")) and line_indent > func_indent:
                # This is potentially an early return - but we need more context
                # Check if there's code after this return at the same or lower indentation
                has_code_after = False
                for k in range(i + 1, min(i + 50, len(lines))):
                    k_stripped = lines[k].strip()
                    k_indent = len(lines[k]) - len(lines[k].lstrip())
                    if not k_stripped or k_stripped == "}":
                        continue
                    if k_indent <= line_indent and k_stripped != "}":
                        has_code_after = True
                        break
                
                if has_code_after and not seen_return:
                    seen_return = True
                    return_line = i

            # If we've seen an early return, look for hooks after it
            if seen_return and i > return_line:
                current_indent = len(lines[i]) - len(lines[i].lstrip())
                ret_indent = len(lines[return_line]) - len(lines[return_line].lstrip())
                if current_indent <= ret_indent:
                    is_hook, hook_name = is_hook_call(stripped)
                    if is_hook:
                        violations.append({
                            "type": "HOOK_AFTER_EARLY_RETURN",
                            "file": filepath,
                            "line": i + 1,
                            "hook": hook_name,
                            "detail": f"Hook `{hook_name}` called after early return on line {return_line + 1}",
                            "code": stripped[:120],
                        })

    return violations


def main():
    all_violations = []
    files = list(find_files(SRC_DIR))
    print(f"Scanning {len(files)} files...", file=sys.stderr)

    for fpath in sorted(files):
        violations = analyze_file(fpath)
        all_violations.extend(violations)

    # Deduplicate
    seen = set()
    unique = []
    for v in all_violations:
        key = (v["type"], v["file"], v["line"])
        if key not in seen:
            seen.add(key)
            unique.append(v)

    # Print results grouped by type
    by_type = {}
    for v in unique:
        by_type.setdefault(v["type"], []).append(v)

    for vtype, items in sorted(by_type.items()):
        print(f"\n{'='*80}")
        print(f"  {vtype} ({len(items)} found)")
        print(f"{'='*80}")
        for v in sorted(items, key=lambda x: (x["file"], x["line"])):
            print(f"\n  {v['file']}:{v['line']}")
            print(f"    {v['detail']}")
            print(f"    Code: {v['code']}")

    print(f"\n{'='*80}")
    print(f"TOTAL potential violations: {len(unique)}")
    for vtype, items in sorted(by_type.items()):
        print(f"  {vtype}: {len(items)}")

if __name__ == "__main__":
    main()
