import os

def inject_script(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Check if already injected
        if 'src="js/welcome.js"' in content:
            print(f"Skipping {filepath}: already injected")
            return

        # Inject before </body>
        if '</body>' in content:
            new_content = content.replace('</body>', '<script src="js/welcome.js"></script>\n</body>')
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Injected into {filepath}")
        else:
            print(f"Warning: No </body> tag in {filepath}")

    except Exception as e:
        print(f"Error processing {filepath}: {e}")

def main():
    for root, dirs, files in os.walk('.'):
        if '.git' in dirs:
            dirs.remove('.git')

        for file in files:
            if file.endswith('.html'):
                inject_script(os.path.join(root, file))

if __name__ == "__main__":
    main()
