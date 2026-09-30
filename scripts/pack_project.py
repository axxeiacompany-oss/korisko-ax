#!/usr/bin/env python3
import os
import zipfile
import sys

def pack_project():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    output_dir = os.path.join(root_dir, 'public')
    os.makedirs(output_dir, exist_ok=True)
    zip_path = os.path.join(output_dir, 'korisko-pdv-projeto.zip')

    ignored_dirs = {'node_modules', 'dist', '.git', '.vscode', '__pycache__', '.upm'}
    ignored_extensions = {'.zip', '.tar.gz', '.log'}

    print(f"Empacotando projeto a partir de: {root_dir}")
    print(f"Destino do arquivo ZIP: {zip_path}")

    file_count = 0
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for current_root, dirs, files in os.walk(root_dir):
            # Exclude ignored directories in-place
            dirs[:] = [d for d in dirs if d not in ignored_dirs and not d.startswith('.git')]

            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in ignored_extensions:
                    continue
                if file.startswith('.env') and file != '.env.example':
                    continue

                abs_file_path = os.path.join(current_root, file)
                rel_path = os.path.relpath(abs_file_path, root_dir)

                # Skip files inside public that end with .zip
                if rel_path.startswith('public/') and rel_path.endswith('.zip'):
                    continue

                zipf.write(abs_file_path, arcname=os.path.join('korisko-pdv', rel_path))
                file_count += 1

    file_size_mb = os.path.getsize(zip_path) / (1024 * 1024)
    print(f"Sucesso! {file_count} arquivos incluídos. Tamanho: {file_size_mb:.2f} MB")
    return zip_path

if __name__ == '__main__':
    pack_project()
