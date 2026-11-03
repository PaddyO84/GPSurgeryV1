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

        # Check if already injected using HTMLParser (ignoring comments and handling unquoted/quoted/relative/query/fragment paths)
        from html.parser import HTMLParser
        from urllib.parse import urlparse
        target_welcome_js = os.path.normcase(os.path.normpath(os.path.join(repo_root, 'js', 'welcome.js')))
        file_dir = os.path.dirname(filepath)

        class WelcomeScriptDetector(HTMLParser):
            def __init__(self):
                super().__init__()
                self.found = False
            def handle_starttag(self, tag, attrs):
                if tag.lower() == 'script':
                    attrs_dict = {k.lower(): (v or '') for k, v in attrs}
                    src = attrs_dict.get('src', '').strip()
                    if src:
                        parsed = urlparse(src)
                        # Reject external URLs (those with a scheme or netloc)
                        if parsed.scheme or parsed.netloc:
                            return
                        # Resolve path relative to repo_root if starting with / else relative to filepath's dir
                        path_part = parsed.path
                        if path_part.startswith('/'):
                            resolved = os.path.normpath(os.path.join(repo_root, path_part.lstrip('/\\')))
                        else:
                            resolved = os.path.normpath(os.path.join(file_dir, path_part))
                        if os.path.normcase(resolved) == target_welcome_js:
                            self.found = True

        detector = WelcomeScriptDetector()
        try:
            detector.feed(content)
        except Exception:
            pass

        if detector.found:
            print(f"Skipping {filepath}: already injected")
            return True

        # Find position of actual closing </body> tag using HTMLParser
        class BodyCloseDetector(HTMLParser):
            def __init__(self):
                super().__init__()
                self.body_end_pos = None

            def handle_endtag(self, tag):
                if tag.lower() == 'body' and self.body_end_pos is None:
                    # getpos() returns (line, offset) with 1-based line and 0-based offset
                    self.body_end_pos = self.getpos()

        close_detector = BodyCloseDetector()
        try:
            close_detector.feed(content)
        except Exception:
            pass

        if close_detector.body_end_pos is not None:
            # Convert (line, offset) into character index
            target_line, target_offset = close_detector.body_end_pos
            lines = content.splitlines(keepends=True)
            char_idx = sum(len(l) for l in lines[:target_line - 1]) + target_offset

            # Calculate relative path to js/welcome.js from filepath
            welcome_js_path = os.path.join(repo_root, 'js', 'welcome.js')
            rel_script_path = os.path.relpath(welcome_js_path, file_dir).replace('\\', '/')

            new_content = content[:char_idx] + f'<script src="{rel_script_path}"></script>\n' + content[char_idx:]
            original_stat = os.stat(filepath)
            with tempfile.NamedTemporaryFile('w', dir=file_dir, delete=False, encoding='utf-8', newline='') as f:
                temp_path = f.name
                f.write(new_content)
            os.chmod(temp_path, original_stat.st_mode)
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
