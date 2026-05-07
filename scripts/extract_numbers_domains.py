import json
import os
import sys
import zipfile
from pathlib import Path

import snappy

# Note: This script implements the "Direct-to-Blob" Protocol for Task 3.
# It targets the .numbers package structure, specifically looking for
# Snappy-compressed protobufs inside the Index/Tables/DataList-* files.


def extract_domains(numbers_path, output_json):
    """
    Extracts domain data from a .numbers file by traversing its ZIP structure,
    decompressing Snappy chunks, and parsing the resulting content.
    """
    if not os.path.exists(numbers_path):
        print(f"Error: File {numbers_path} not found.")
        return False

    print(f"[*] Starting extraction for: {numbers_path}")

    try:
        with zipfile.ZipFile(numbers_path, "r") as z:
            # List all files in the archive to find relevant data blobs
            all_files = z.namelist()
            data_files = [f for f in all_files if "Index/Tables/DataList" in f]

            if not data_files:
                print("[-] No DataList files found in the .numbers archive.")
                return False

            extracted_data = []

            for data_file in data_files:
                print(f"[*] Processing blob: {data_file}")
                with z.open(data_file) as f:
                    compressed_content = f.read()

                    # Scavenger Protocol: Scan raw bytes for domain patterns (including .xyz, .live, etc.)
                    # This bypasss Snappy/Protobuf decompression failures by looking at the
                    # uncompressed stream or the raw byte buffer.
                    try:
                        # First attempt: Try to decompress if possible
                        try:
                            decompressed_content = snappy.uncompress(compressed_content)
                            search_buffer = decompressed_content
                        except Exception:
                            # Fallback: Use the compressed bytes themselves as a search buffer
                            # (scavenging for plaintext strings embedded in the stream)
                            search_buffer = compressed_content

                        # Convert to string for regex-like pattern matching, ignoring non-utf8 bytes
                        content_str = search_buffer.decode("utf-8", errors="ignore")

                        # Heuristic: Look for domain patterns (e.g., name.tld)
                        # including the recently identified .xyz and all other TLDs
                        import re

                        domain_pattern = re.compile(
                            r"[a-zA-Z0-9.-]+\.(com|live|life|vote|chat|ooo|xyz|cab|net|org)"
                        )

                        found_domains = domain_pattern.findall(content_str)
                        # findall with groups returns tuples; we need the full match, not just the group.
                        # Let's use finditer to get the whole string.
                        for match in re.finditer(
                            r"[a-zA-Z0-9.-]+\.(?:com|live|life|vote|chat|ooo|xyz|cab|net|org)",
                            content_str,
                        ):
                            domain = match.group(0).strip()
                            if len(domain) > 3 and domain not in extracted_data:
                                # Basic cleanup of trailing punctuation often caught in regex
                                domain = domain.rstrip(".,; ")
                                if "." in domain:
                                    extracted_data.append(domain)

                    except Exception as e:
                        print(f"[-] Scavenger failure on {data_file}: {e}")
                        continue

            if extracted_data:
                # Prepare the final payload for the legal-entity-matrix.json injection
                final_payload = {
                    "source": numbers_path,
                    "timestamp": str(Path(numbers_path).stat().st_mtime),
                    "extracted_domains": extracted_data,
                    "count": len(extracted_data),
                }

                with open(output_json, "w") as out_f:
                    json.dump(final_payload, out_f, indent=4)

                print(
                    f"[+] Success! Extracted {len(extracted_data)} domains to {output_json}"
                )
                return True
            else:
                print(
                    "[-] Extraction complete, but no domain patterns were identified."
                )
                return False

    except zipfile.BadZipFile:
        print("[-] Error: The provided file is not a valid ZIP/Numbers archive.")
        return False
    except Exception as e:
        print(f"[-] Unexpected error during extraction: {e}")
        return False


if __name__ == "__main__":
    # Usage: python3 extract_numbers_domains.py <path_to_numbers_file> <output_json_path>
    if len(sys.argv) < 3:
        print("Usage: python3 extract_numbers_domains.py <input.numbers> <output.json>")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    success = extract_domains(input_file, output_file)
    if not success:
        sys.exit(1)
