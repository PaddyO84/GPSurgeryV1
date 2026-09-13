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

        # Inject before </body>
        if '</body>' in content:
            new_content = content.replace('</body>', f'<script src="{rel_script_path}"></script>\n</body>')
            temp_path = f"{filepath}.tmp"
            with open(temp_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            os.replace(temp_path, filepath)
            temp_path = None
            print(f"Injected into {filepath}")
        else:
            print(f"Warning: No </body> tag in {filepath}")
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
    for root, dirs, files in os.walk('.'):
        for skip_dir in ['.git', 'node_modules', 'coverage']:
            if skip_dir in dirs:
                dirs.remove(skip_dir)

        for file in files:
            if file.endswith('.html') and not file.startswith('email_'):
                success = inject_script(os.path.join(root, file))
                if not success:
                    failed = True

    if failed:
        sys.exit(1)

if __name__ == "__main__":
    main()
