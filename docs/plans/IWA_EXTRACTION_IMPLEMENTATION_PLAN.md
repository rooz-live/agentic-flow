# IWA (Snappy-Compressed Protobuf) Extraction Plan

## Context
Apple Numbers/Pages files (`.numbers`, `.pages`) are zip archives containing `.iwa` files. These are not standard text; they are snappy-compressed protobuf binaries. 
Attempting to use `osascript` to remotely trigger the Numbers GUI to Export as CSV results in an AppleEvent timeout (`-1712`). The GUI halts execution via iCloud sandbox intercepts or password prompts.

## Proposed Implementation (Non-GUI Approach)

We will bypass the Numbers application completely using a CLI-native decompression toolchain.

1. **Unzip the `.numbers` bundle:**
   `unzip File.numbers -d /tmp/numbers_extract`

2. **Decompress `.iwa` using `snappy` & `protobuf`:**
   We will utilize a Python script leveraging `python-snappy` and `protobuf` bindings to read the internal `Index/Document.iwa` blobs directly.
   
   ```python
   import snappy
   with open('/tmp/numbers_extract/Index/Document.iwa', 'rb') as f:
       compressed_data = f.read()
       # IWA files have a specific header structure before the snappy blob
       # Needs protobuf schemas to parse the sheet data completely.
   ```

3. **Alternative (iwa-cli):**
   Utilize pre-existing open-source tools like `iwa-cli` or `oboothe/iwa` to automatically parse these binary blobs into JSON/CSV without any AppleEvent reliance.

## ROAM Risk Assessment
- **Risk:** Encrypted `.numbers` files will fail extraction natively because the snappy chunk is AES-encrypted.
- **Mitigation (Accepted):** The process will check for encryption headers. If encrypted, it flags the file for manual intervention or fails gracefully. We will not store or pass keychain passwords into the orchestrator.

## Next Steps
- [ ] Evaluate `iwa` python package capabilities.
- [ ] Write `scripts/_SYSTEM/iwa-extractor.sh`.
- [ ] Wire the extracted output directly into `legal-entity-matrix.json`.