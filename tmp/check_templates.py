import os
import csv

def find_csvs():
    for root, dirs, files in os.walk('c:\\Entrega'):
        if '.git' in root or 'node_modules' in root:
            continue
        for file in files:
            if file.endswith('.csv'):
                path = os.path.join(root, file)
                print(f"\n--- Found CSV: {path} ---")
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        reader = csv.reader(f)
                        headers = next(reader)
                        print(f"Headers: {headers}")
                except Exception as e:
                    print(f"Error reading {path}: {e}")

if __name__ == "__main__":
    find_csvs()
