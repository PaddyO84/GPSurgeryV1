import os

# Define replacements (Order matters: most specific to least specific)
replacements = {
    # Names
    "Carndonagh Health Centre": "Example Health Centre",
    "Carndonagh Medical Practice": "Example Medical Practice",
    "Carndonagh Community Hospital": "General Hospital",

    # Emails
    "reception@carndonaghhealthcentre.ie": "reception@examplehealthcentre.ie",
    "patricknoone+surgery@gmail.com": "admin@example.com",

    # Addresses
    "Derry Rd, Carndonagh, Co. Donegal": "123 Main Street, Example Town, Co. Donegal",
    "Derry Rd, Carndonagh": "123 Main Street, Example Town",
    "Convent Road, Carndonagh": "Church Road, Example Town",
    "F93 EW7T": "D01 XYZ1",

    # Phones (Landlines - various formats)
    "074-93-74242": "01-234-5678",
    "074 93 74242": "01 234 5678",

    "074-93-74262": "01-234-5679",
    "074 93 74262": "01 234 5679",
    "(074) 93 74262": "(01) 234 5679",
    "0749374262": "012345679",

    "074 93 74208": "01 234 5670",
    "(074) 93 74208": "(01) 234 5670",
    "0749374208": "012345670",

    # Phones (Out of Hours / Mobile formats)
    "0818 400 911": "01 987 6543",
    "(0818) 400 911": "(01) 987 6543",
    "0818-400-911": "01-987-6543",
    "0818400911": "019876543",

    # Schema.org specific
    '"telephone": "074-93-74262"': '"telephone": "01-234-5679"',
    '"addressLocality": "Carndonagh"': '"addressLocality": "Example Town"',
    '"streetAddress": "Derry Rd"': '"streetAddress": "123 Main St"',

    # Google Maps (Replace specific iframe with a placeholder comment)
    'src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2279.1627050302824!2d-7.273611684179361!3d55.25305598042457!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x486027a0d6c0a0d9%3A0x6d0263f91361810!2sCarndonagh%20Health%20Centre!5e0!3m2!1sen!2sie!4v1700000000000!5m2!1sen!2sie"': 'src="" style="background-color: #eee;" data-note="Map removed for anonymization"',

    # Generic Fallback (Must be last)
    "Carndonagh": "Example Town"
}

def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        new_content = content
        for old, new in replacements.items():
            new_content = new_content.replace(old, new)

        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated: {filepath}")
        else:
            print(f"No changes: {filepath}")

    except Exception as e:
        print(f"Error processing {filepath}: {e}")

def main():
    extensions = ['.html', '.gs', '.md', '.json', '.js', '.css']
    for root, dirs, files in os.walk('.'):
        if '.git' in dirs:
            dirs.remove('.git')

        for file in files:
            if any(file.endswith(ext) for ext in extensions):
                process_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
