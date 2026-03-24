#!/usr/bin/env python3
"""Batch-create error.tsx for portal sub-routes and verify all coverage."""
import os
import glob

CONTENT = '''"use client";
export { default } from "@/components/shared/route-error-boundary";
'''

PORTAL_CONTENT = '''"use client";
export { default } from "@/components/portal/portal-error-boundary";
'''

def create_error_boundaries():
    count = 0
    
    # Portal routes that need portal-specific error boundary
    portal_dirs = [
        "src/app/portal/company",
        "src/app/portal/contractors",
        "src/app/portal/contractors/[contractorId]",
        "src/app/portal/activity",
        "src/app/portal/invite",
        "src/app/portal/onboarding",
        "src/app/portal/post-job",
        "src/app/portal/products",
        "src/app/portal/company-profile",
        "src/app/portal/new-project",
    ]
    
    for d in portal_dirs:
        error_path = os.path.join(d, "error.tsx")
        if os.path.isdir(d) and not os.path.exists(error_path):
            with open(error_path, "w") as f:
                f.write(PORTAL_CONTENT)
            count += 1
            print(f"✅ PORTAL: {error_path}")
    
    # Find ALL remaining uncovered dirs across the entire app
    for root in ["src/app/(app)", "src/app/portal"]:
        pages = glob.glob(f"{root}/**/page.tsx", recursive=True)
        for p in sorted(pages):
            d = os.path.dirname(p)
            error_path = os.path.join(d, "error.tsx")
            if os.path.exists(error_path):
                continue
            
            # Walk up to find nearest parent with error.tsx
            has_parent = False
            check = os.path.dirname(d)
            while check.startswith(root) and len(check) >= len(root):
                if os.path.exists(os.path.join(check, "error.tsx")):
                    has_parent = True
                    break
                check = os.path.dirname(check)
            
            if not has_parent:
                is_portal = d.startswith("src/app/portal")
                c = PORTAL_CONTENT if is_portal else CONTENT
                os.makedirs(d, exist_ok=True)
                with open(error_path, "w") as f:
                    f.write(c)
                count += 1
                print(f"✅ {'PORTAL' if is_portal else 'APP'}: {error_path}")
    
    print(f"\nTotal new error.tsx files created: {count}")
    
    # Final count
    all_errors = glob.glob("src/app/**/error.tsx", recursive=True)
    all_pages = glob.glob("src/app/**/page.tsx", recursive=True)
    print(f"Total error.tsx files: {len(all_errors)}")
    print(f"Total page.tsx files: {len(all_pages)}")

if __name__ == "__main__":
    create_error_boundaries()
