import os
import re
import sys
import tempfile

def inject_script(filepath, repo_root):
    temp_path = None
    try:
        if os.path.islink(filepath):
            print(f"Skipping symlink: {filepath}", file=sys.stderr)
            return True

        with open(filepath, 'r', encoding='utf-8', newline='') as f:
            content = f.read()

        # Check if already injected (relative: js/welcome.js, ./js/welcome.js, ../js/welcome.js;
        # or root-relative: /js/welcome.js; with optional query string or fragment in a script tag)
        if re.search(r'<script\b[^>]*?\bsrc\s*=\s*["\'](?:(?:\.\./)*(?:\./)?|/)?js/welcome\.js(?:[?#][^"\']*)?["\']', content, re.IGNORECASE):
            print(f"Skipping {filepath}: already injected")
            return True

        # Calculate relative path to js/welcome.js from filepath
        file_dir = os.path.dirname(filepath)
        welcome_js_path = os.path.join(repo_root, 'js', 'welcome.js')
        rel_script_path = os.path.relpath(welcome_js_path, file_dir).replace('\\', '/')

        # Inject before </body> (case-insensitive)
        body_match = re.search(r'</body\s*>', content, re.IGNORECASE)
        if body_match:
            start, end = body_match.span()
            matched_tag = body_match.group(0)
            new_content = content[:start] + f'<script src="{rel_script_path}"></script>\n' + matched_tag + content[end:]
            original_stat = os.stat(filepath)
            with tempfile.NamedTemporaryFile('w', dir=file_dir, delete=False, encoding='utf-8', newline='') as f:
                temp_path = f.name
                f.write(new_content)
            try:
                os.chmod(temp_path, original_stat.st_mode)
            except Exception:
                raise
            os.replace(temp_path, filepath)
            temp_path = None
            print(f"Injected into {filepath}")
        else:
            print(f"Skipping {filepath}: No </body> tag found")
            return True
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
    repo_root = os.path.dirname(os.path.abspath(__file__))
    for root, dirs, files in os.walk(repo_root):
        dirs[:] = [d for d in dirs if d not in prune_dirs]

        for file in files:
            if file.endswith('.html') and not file.startswith('email_'):
                success = inject_script(os.path.join(root, file), repo_root)
                if not success:
                    failed = True

    if failed:
        sys.exit(1)

if __name__ == "__main__":
    main()
