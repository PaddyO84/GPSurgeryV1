import os
import sys
import json
import tempfile
import shutil

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

    # Validate every entry before use: keys must be non-empty strings, values must be strings, keys must not equal replacement values, and replacement values must not contain any source key.
    type_invalid = [
        (k, v) for k, v in combined.items()
        if not isinstance(k, str) or not k or not isinstance(v, str)
    ]
    if type_invalid:
        for idx, (k, v) in enumerate(type_invalid, start=1):
            print(f"Error: Invalid replacement entry #{idx} with key_type={type(k).__name__}, value_type={type(v).__name__} (total invalid entries: {len(type_invalid)}). Keys must be non-empty strings, values must be strings, source keys must not equal replacement values, and replacement values must not contain any configured source keys.", file=sys.stderr)
        sys.exit(1)

    value_invalid = [
        (k, v) for k, v in combined.items()
        if k == v or any(source_key in v for source_key in combined.keys())
    ]
    if value_invalid:
        for idx, (k, v) in enumerate(value_invalid, start=1):
            print(f"Error: Invalid replacement entry #{idx} with key_type={type(k).__name__}, value_type={type(v).__name__} (total invalid entries: {len(value_invalid)}). Keys must be non-empty strings, values must be strings, source keys must not equal replacement values, and replacement values must not contain any configured source keys.", file=sys.stderr)
        sys.exit(1)

    # Order all source strings from most specific (longest) to least specific (shortest)
    sorted_items = sorted(combined.items(), key=lambda item: len(item[0]), reverse=True)
    return dict(sorted_items)

matched_sources = set()

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Anonymize sensitive information across project files.")
    env_allow_unmatched = os.environ.get("ANONYMIZE_ALLOW_UNMATCHED", "").strip().lower() in {"1", "true", "yes"}
    parser.add_argument("--allow-unmatched", action="store_true", default=env_allow_unmatched, help="Do not fail if some replacements are unmatched across files.")
    args = parser.parse_args()

    replacements = load_replacements()

    extensions = ['.html', '.gs', '.md', '.json', '.js', '.css', '.py', '.yml', '.yaml', '.xml', '.iml', '.txt', '.csv']
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
            for m in pattern.finditer(content):
                matched_sources.add(m.group(0))
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

    # Second pass: stage replacements in temporary files before modifying any repository files
    staged_replacements = []
    for file_path in eligible_files:
        current_tf_name = None
        try:
            if os.path.islink(file_path):
                continue
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            def replace_fn(m):
                matched = m.group(0)
                return replacements[matched]
            new_content = pattern.sub(replace_fn, content)
            if new_content != content:
                target_dir = os.path.dirname(os.path.abspath(file_path))
                orig_stat = os.stat(file_path)
                tf = tempfile.NamedTemporaryFile('w', dir=target_dir, delete=False, encoding='utf-8')
                current_tf_name = tf.name
                tf.write(new_content)
                tf.close()
                staged_replacements.append((current_tf_name, file_path, orig_stat.st_mode))
                current_tf_name = None
        except Exception as e:
            print(f"Error preparing {file_path}: {e}", file=sys.stderr)
            if current_tf_name and os.path.exists(current_tf_name):
                try: os.remove(current_tf_name)
                except OSError: pass
            failed = True

    if failed:
        for temp_p, _, _ in staged_replacements:
            if os.path.exists(temp_p):
                try: os.remove(temp_p)
                except OSError: pass
        sys.exit(1)

    # Commit staged replacements now that all files have succeeded
    committed_backups = []
    failed_idx = None

    try:
        for i, (temp_p, dest_p, mode) in enumerate(staged_replacements):
            backup_p = None
            replace_succeeded = False
            try:
                if os.path.exists(dest_p):
                    dest_dir = os.path.dirname(dest_p) or "."
                    bf = tempfile.NamedTemporaryFile(prefix=".anonymize_backup_", dir=dest_dir, delete=False)
                    bf.close()
                    backup_p = bf.name
                    shutil.copyfile(dest_p, backup_p)
                    try:
                        os.chmod(backup_p, 0o600)
                    except OSError:
                        pass

                os.chmod(temp_p, mode)
                os.replace(temp_p, dest_p)
                replace_succeeded = True
                committed_backups.append((dest_p, backup_p, mode))
            except Exception as e:
                print(f"Error committing {dest_p}: {e}", file=sys.stderr)
                failed = True
                failed_idx = i
                if not replace_succeeded and backup_p and os.path.exists(backup_p):
                    try:
                        os.remove(backup_p)
                    except OSError as err:
                        print(f"Error removing unused backup file {backup_p}: {err}", file=sys.stderr)
                break

            try:
                print(f"Updated: {dest_p}")
            except Exception as e:
                print(f"Notice: failed to print update message for {dest_p}: {e}", file=sys.stderr)
    finally:
        pass

    if failed:
        # Rollback all committed destinations
        for dest_p, backup_p, orig_mode in reversed(committed_backups):
            try:
                if backup_p and os.path.exists(backup_p):
                    os.replace(backup_p, dest_p)
                    os.chmod(dest_p, orig_mode)
                elif not backup_p and os.path.exists(dest_p):
                    os.remove(dest_p)
            except Exception as e:
                print(f"Error rolling back {dest_p}: {e}", file=sys.stderr)

        # Remove temporary files for failed and unprocessed entries
        start_cleanup = failed_idx if failed_idx is not None else 0
        for temp_p, _, _ in staged_replacements[start_cleanup:]:
            if os.path.exists(temp_p):
                try: os.remove(temp_p)
                except OSError: pass
        sys.exit(1)
    else:
        # Commit succeeded, clean up backup files
        cleanup_failed = False
        for _, backup_p, _ in committed_backups:
            if backup_p and os.path.exists(backup_p):
                try:
                    os.remove(backup_p)
                except OSError as err:
                    print(f"Error removing backup file {backup_p}: {err}", file=sys.stderr)
                    cleanup_failed = True
        if cleanup_failed:
            sys.exit(1)

if __name__ == "__main__":
    main()
