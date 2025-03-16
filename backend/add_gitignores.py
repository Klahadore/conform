import os

# Path to the HTML outputs directory
HTML_OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "html_outputs")

def add_gitignores_to_all_subdirs():
    # Create the HTML_OUTPUT_DIR if it doesn't exist
    os.makedirs(HTML_OUTPUT_DIR, exist_ok=True)
    
    # Add a .gitignore file to the root HTML_OUTPUT_DIR
    root_gitignore_path = os.path.join(HTML_OUTPUT_DIR, ".gitignore")
    if not os.path.exists(root_gitignore_path):
        with open(root_gitignore_path, "w") as f:
            f.write("# Ignore all files in this directory\n")
            f.write("*\n")
            f.write("# Except for .gitignore files\n")
            f.write("!.gitignore\n")
            f.write("# And subdirectories\n")
            f.write("!*/\n")
        print(f"Added .gitignore to root directory: {HTML_OUTPUT_DIR}")
    
    # Find all subdirectories in HTML_OUTPUT_DIR
    for item in os.listdir(HTML_OUTPUT_DIR):
        item_path = os.path.join(HTML_OUTPUT_DIR, item)
        if os.path.isdir(item_path):
            # Add a .gitignore file to this directory
            dir_gitignore_path = os.path.join(item_path, ".gitignore")
            if not os.path.exists(dir_gitignore_path):
                with open(dir_gitignore_path, "w") as f:
                    f.write("# Ignore all files in this directory\n")
                    f.write("*\n")
                    f.write("# Except for .gitignore files\n")
                    f.write("!.gitignore\n")
                print(f"Added .gitignore to directory: {item}")
            else:
                print(f"Directory already has .gitignore: {item}")

if __name__ == "__main__":
    add_gitignores_to_all_subdirs()
    print("Done adding .gitignore files to all subdirectories.") 