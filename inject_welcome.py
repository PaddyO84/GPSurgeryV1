import os
import re
import sys

def inject_script(filepath):
    temp_path = None
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Check if already injected (handling single/double quotes and relative paths, e.g. js/welcome.js, ./js/welcome.js, ../js/welcome.js)
        if re.search(r'src=["\'](?:\.\./)*?(?:\./)?js/welcome\.js["\']', content):
            print(f"Skipping {filepath}: already injected")
            return True

        # Calculate relative path to js/welcome.js from filepath
        file_dir = os.path.dirname(filepath)
        rel_script_path = os.path.relpath(os.path.join('.', 'js', 'welcome.js'), file_dir).replace('\\', '/')

        # Inject before </body> (case-insensitive)
        body_match = re.search(r'</body\s*>', content, re.IGNORECASE)
        if body_match:
            start, end = body_match.span()
            matched_tag = body_match.group(0)
            new_content = content[:start] + f'<script src="{rel_script_path}"></script>\n' + matched_tag + content[end:]
            temp_path = f"{filepath}.tmp"
            with open(temp_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            os.replace(temp_path, filepath)
            temp_path = None
            print(f"Injected into {filepath}")
        else:
            print(f"Warning: No </body> tag in {filepath}")
            return False
        return True
    except Exception as e:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass
        print(f"Error processing {filepath}: {e}")
        return False

def main():
    failed = False
    prune_dirs = {'.git', 'node_modules', '.venv', 'venv', 'env', '.env', 'coverage', 'dist', 'build'}
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in prune_dirs]

        for file in files:
            if file.endswith('.html') and not file.startswith('email_'):
                success = inject_script(os.path.join(root, file))
                if not success:
                    failed = True

    if failed:
        sys.exit(1)

if __name__ == "__main__":
    main()
