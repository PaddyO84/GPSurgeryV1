import os
import sys
import json
import tempfile

# Default replacements schema (loaded from untracked config or environment secret)
default_replacements = {
    # Placeholders/Examples only; real practice names and contact details must be provided
    # via untracked anonymize_local.json (see anonymize_config.example.json) or ANONYMIZE_REPLACEMENTS_JSON
}

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))

def get_config_path():
    env_path = os.environ.get("ANONYMIZE_CONFIG_FILE")
    if env_path:
        return os.path.normpath(os.path.abspath(env_path))
    return os.path.normpath(os.path.join(REPO_ROOT, "anonymize_local.json"))

def load_replacements():
    """Loads replacements from untracked local file or environment config, falling back to default replacements,
    ensuring custom configured entries are prioritized and all source strings are sorted from most specific to least specific."""
    configured = {}
    custom_path = get_config_path()
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

    if not combined:
        print("Error: No anonymization replacements found. Provide anonymize_local.json or ANONYMIZE_REPLACEMENTS_JSON.", file=sys.stderr)
        sys.exit(1)

    # Validate every entry before use: keys must be non-empty strings, values must be strings, and keys must not equal replacement values.
    invalid = [
        (k, v) for k, v in combined.items()
        if not isinstance(k, str) or not k or not isinstance(v, str) or k == v
    ]
    if invalid:
        for idx, (k, v) in enumerate(invalid, start=1):
            print(f"Error: Invalid replacement entry #{idx} with key_type={type(k).__name__}, value_type={type(v).__name__} (total invalid entries: {len(invalid)}). Keys must be non-empty strings, values must be strings, and source keys must not equal replacement values.", file=sys.stderr)
        sys.exit(1)

    # Order all source strings from most specific (longest) to least specific (shortest)
    sorted_items = sorted(combined.items(), key=lambda item: len(item[0]), reverse=True)
    return dict(sorted_items)

matched_sources = set()

def process_file(filepath, replacements):
    temp_path = None
    try:
        if os.path.islink(filepath):
            print(f"Skipping symlink: {filepath}", file=sys.stderr)
            return True

        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Ensure content is a string
        if not isinstance(content, str):
            raise TypeError(f"Expected file content to be a string, got {type(content)}")
        # Build a regex pattern that matches any of the old strings, longest first to avoid partial matches
        import re
        pattern = re.compile('|'.join(map(re.escape, replacements.keys())))
        def replace_fn(m):
            matched = m.group(0)
            matched_sources.add(matched)
            return replacements[matched]
        new_content = pattern.sub(replace_fn, content)
        if new_content != content:
            target_dir = os.path.dirname(os.path.abspath(filepath))
            orig_stat = os.stat(filepath)
            with tempfile.NamedTemporaryFile('w', dir=target_dir, delete=False, encoding='utf-8') as tf:
                temp_path = tf.name
                tf.write(new_content)
            os.chmod(temp_path, orig_stat.st_mode)
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
    import argparse
    parser = argparse.ArgumentParser(description="Anonymize sensitive information across project files.")
    env_allow_unmatched = os.environ.get("ANONYMIZE_ALLOW_UNMATCHED", "").strip().lower() in {"1", "true", "yes"}
    parser.add_argument("--allow-unmatched", action="store_true", default=env_allow_unmatched, help="Do not fail if some replacements are unmatched across files.")
    args = parser.parse_args()

    replacements = load_replacements()

    extensions = ['.html', '.gs', '.md', '.json', '.js', '.css', '.py']
    failed = False
    prune_dirs = {'.git', 'node_modules', '.venv', 'venv', 'env', '.env', 'coverage', 'dist', 'build'}
    skip_files = {'anonymize.py', 'anonymize_local.json', 'anonymize_config.example.json'}

    resolved_custom_config = get_config_path()

    eligible_files = []
    for root, dirs, files in os.walk(REPO_ROOT):
        dirs[:] = [d for d in dirs if d not in prune_dirs]

        for file in files:
            if file in skip_files:
                continue
            file_path = os.path.normpath(os.path.abspath(os.path.join(root, file)))
            if file_path == resolved_custom_config:
                continue
            if any(file.endswith(ext) for ext in extensions):
                eligible_files.append(file_path)

    # First pass: check for matches across all eligible files without writing changes
    import re
    pattern = re.compile('|'.join(map(re.escape, replacements.keys())))
    for file_path in eligible_files:
        if os.path.islink(file_path):
            continue
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            for source in replacements.keys():
                if source in content:
                    matched_sources.add(source)
        except Exception as e:
            print(f"Error inspecting {file_path}: {e}", file=sys.stderr)
            failed = True

    unmatched = set(replacements.keys()) - matched_sources
    if unmatched:
        print(f"Error: {len(unmatched)} configured replacement(s) were not matched across any files.", file=sys.stderr)
        if not args.allow_unmatched:
            failed = True

    if failed:
        sys.exit(1)

    # Second pass: write replacements now that validation has passed
    for file_path in eligible_files:
        success = process_file(file_path, replacements)
        if not success:
            failed = True

    if failed:
        sys.exit(1)

if __name__ == "__main__":
    main()
