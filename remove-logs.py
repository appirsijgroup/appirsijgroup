#!/usr/bin/env python3
import re
import os
import glob

def remove_console_logs(file_path):
    """Remove console.log, console.info, console.debug, console.warn from file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Pattern untuk multi-line console.log
    # Match console.log(...) dengan kemungkinan multi-line content
    patterns = [
        # Multi-line console.log with opening brace
        (r'console\.log\([^)]*\{[^}]*\}[^)]*\)', '', re.DOTALL),
        (r'console\.info\([^)]*\{[^}]*\}[^)]*\)', '', re.DOTALL),
        (r'console\.debug\([^)]*\{[^}]*\}[^)]*\)', '', re.DOTALL),
        (r'console\.warn\([^)]*\{[^}]*\}[^)]*\)', '', re.DOTALL),

        # Single line console.log (simple case)
        (r'console\.log\([^)]*\);?\s*\n', '', re.DOTALL),
        (r'console\.info\([^)]*\);?\s*\n', '', re.DOTALL),
        (r'console\.debug\([^)]*\);?\s*\n', '', re.DOTALL),
        (r'console\.warn\([^)]*\);?\s*\n', '', re.DOTALL),
    ]

    for pattern, replacement, flags in patterns:
        content = re.sub(pattern, replacement, content, flags=flags)

    # Juga hapus baris kosong beruntun yang mungkin tersisa
    content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)

    # Hanya tulis jika ada perubahan
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    # Find all .ts and .tsx files in src directory
    files = []
    for ext in ['*.ts', '*.tsx']:
        files.extend(glob.glob(f'src/**/{0}'.format(ext), recursive=True))

    print(f'Found {len(files)} files')

    modified_count = 0
    for file_path in files:
        if remove_console_logs(file_path):
            print(f'Modified: {file_path}')
            modified_count += 1

    print(f'\nTotal files modified: {modified_count}')

if __name__ == '__main__':
    main()
