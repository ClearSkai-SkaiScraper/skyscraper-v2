#!/usr/bin/env python3
"""Prisma schema vs DB drift audit script."""
import re
import sys

# Read schema
with open('prisma/schema.prisma', 'r') as f:
    content = f.read()

# Parse models
models = {}
current_model = None
for line in content.split('\n'):
    model_match = re.match(r'^model\s+(\w+)\s*\{', line)
    if model_match:
        current_model = model_match.group(1)
        models[current_model] = current_model
    if current_model and '@@map(' in line:
        map_match = re.search(r'@@map\("([^"]+)"\)', line)
        if map_match:
            models[current_model] = map_match.group(1)
    if current_model and line.strip() == '}':
        current_model = None

prisma_tables = set(models.values())

# Read DB tables from file
with open('/tmp/db_tables.txt', 'r') as f:
    db_tables = set(line.strip() for line in f if line.strip() and line.strip() != '_prisma_migrations')

orphan = sorted(db_tables - prisma_tables)
missing = sorted(prisma_tables - db_tables)

print('=' * 60)
print('PRISMA vs DATABASE DRIFT AUDIT')
print('=' * 60)
print(f'\nDB tables: {len(db_tables)}')
print(f'Prisma table mappings: {len(prisma_tables)}')
print(f'Matched: {len(db_tables & prisma_tables)}')

print(f'\n{"=" * 60}')
print(f'ORPHAN TABLES (in DB but NOT in Prisma): {len(orphan)}')
print('=' * 60)
for t in orphan:
    print(f'  - {t}')

print(f'\n{"=" * 60}')
print(f'MISSING TABLES (in Prisma but NOT in DB): {len(missing)}')
print('=' * 60)
for t in missing:
    model_names = [m for m, tab in models.items() if tab == t]
    model_name = model_names[0] if model_names else t
    suffix = f' (model: {model_name})' if model_name != t else ''
    print(f'  - {t}{suffix}')
