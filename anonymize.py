import os
import sys
import json

# Default replacements schema (loaded from untracked config or environment secret)
default_replacements = {
    # Placeholders/Examples only; real practice names and contact details must be provided
    # via untracked anonymize_local.json (see anonymize_config.example.json) or ANONYMIZE_REPLACEMENTS_JSON
}

def load_replacements():
    """Loads replacements from untracked local file or environment config, falling back to default replacements,
    ensuring custom configured entries are prioritized and all source strings are sorted from most specific to least specific."""
    configured = {}
    custom_path = os.environ.get("ANONYMIZE_CONFIG_FILE", "anonymize_local.json")
    if os.path.exists(custom_path):
        try:
            with open(custom_path, "r", encoding="utf-8") as f:
                loaded = json.load(f)
        except Exception as err:
            print(f"Error: Could not read or parse {custom_path}: {err}", file=sys.stderr)
            sys.exit(1)
        if not isinstance(loaded, dict):
            print(f"Error: Configuration in {custom_path} must be a JSON object", file=sys.stderr)
            sys.exit(1)
        configured.update(loaded)
    elif os.environ.get("ANONYMIZE_REPLACEMENTS_JSON"):
        try:
            loaded = json.loads(os.environ["ANONYMIZE_REPLACEMENTS_JSON"])
        except Exception as err:
            print(f"Error: Could not parse ANONYMIZE_REPLACEMENTS_JSON: {err}", file=sys.stderr)
            sys.exit(1)
        if not isinstance(loaded, dict):
            print("Error: ANONYMIZE_REPLACEMENTS_JSON must be a JSON object", file=sys.stderr)
            sys.exit(1)
        configured.update(loaded)

    # Merge configured with defaults, letting configured override defaults
    combined = dict(default_replacements)
    combined.update(configured)

    # Order all source strings from most specific (longest) to least specific (shortest)
    sorted_items = sorted(combined.items(), key=lambda item: len(item[0]), reverse=True)
    return dict(sorted_items)

replacements = load_replacements()

def process_file(filepath):
    temp_path = None
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        new_content = content
        for old, new in replacements.items():
            new_content = new_content.replace(old, new)

        if new_content != content:
            temp_path = f"{filepath}.tmp"
            with open(temp_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            os.replace(temp_path, filepath)
            temp_path = None
            print(f"Updated: {filepath}")
        else:
            print(f"No changes: {filepath}")
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
    extensions = ['.html', '.gs', '.md', '.json', '.js', '.css', '.py']
    failed = False
    prune_dirs = {'.git', 'node_modules', '.venv', 'venv', 'env', '.env', 'coverage', 'dist', 'build'}
    skip_files = {'anonymize.py', 'anonymize_local.json', 'anonymize_config.example.json'}
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in prune_dirs]

        for file in files:
            if file in skip_files:
                continue
            if any(file.endswith(ext) for ext in extensions):
                success = process_file(os.path.join(root, file))
                if not success:
                    failed = True

    if failed:
        sys.exit(1)

if __name__ == "__main__":
    main()
