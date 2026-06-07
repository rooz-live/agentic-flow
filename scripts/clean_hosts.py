#!/usr/bin/env python3
import sys

def main():
    path = '/etc/hosts'
    bad_domains = {'epic.cab', 'goodreadr.com', 'artchat.art', 'decibel.co', 'summerjobswap.com'}
    
    try:
        with open(path, 'r') as f:
            lines = f.readlines()
    except PermissionError:
        print(f"Error: Permission denied. Please run this script with sudo:\n  sudo python3 {sys.argv[0]}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error reading {path}: {e}", file=sys.stderr)
        sys.exit(1)

    cleaned_lines = []
    removed = []
    for line in lines:
        if any(dom in line for dom in bad_domains) and not line.strip().startswith('#'):
            removed.append(line.strip())
        else:
            cleaned_lines.append(line)

    if not removed:
        print("No stale overrides found in /etc/hosts. Nothing to do!")
        sys.exit(0)

    print("Found stale overrides:")
    for r in removed:
        print(f"  - {r}")

    try:
        with open(path, 'w') as f:
            f.writelines(cleaned_lines)
        print("\nSuccessfully cleaned /etc/hosts!")
    except Exception as e:
        print(f"Error writing to {path}: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
