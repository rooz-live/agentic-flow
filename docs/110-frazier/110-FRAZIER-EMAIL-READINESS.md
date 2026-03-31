# 110 Frazier Email Readiness – Pre-Send Validation and Send Checklist

Per the ArtChat Move 110 Frazier PDF + Consolidate-Then-Extend plan: run pre-send validation, then send landlord and Amanda emails and confirm amendments with Amanda.

## Validation status (in-repo drafts)

- **EMAIL-TO-LANDLORD-110-FRAZIER.md**: validation-runner PASS (4/4); pre-send-email-gate APPROVED TO SEND (6/6 = 100%).
- **EMAIL-TO-AMANDA-REQUEST-APPROVAL.md**: validation-runner PASS (4/4); pre-send-email-gate APPROVED TO SEND (6/6 = 100%).

Both drafts are ready to send once copied to your Personal legal folder (or used as-is from repo).

## Draft locations (in-repo)

| Email | Path |
|-------|------|
| Landlord (amendments) | `docs/110-frazier/EMAIL-TO-LANDLORD-110-FRAZIER.md` |
| Amanda (status + amendment confirmation) | `docs/110-frazier/EMAIL-TO-AMANDA-REQUEST-APPROVAL.md` |

To use these from your Personal legal folder, copy them to:

- `~/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/12-AMANDA-BECK-110-FRAZIER/`

## 1. Pre-send validation

From the repo root:

```bash
# Validation runner (placeholder, legal citation, pro se, attachment checks)
./scripts/validation-runner.sh docs/110-frazier/EMAIL-TO-LANDLORD-110-FRAZIER.md
./scripts/validation-runner.sh docs/110-frazier/EMAIL-TO-AMANDA-REQUEST-APPROVAL.md

# Pre-send gate (full 5-check gate)
./scripts/pre-send-email-gate.sh docs/110-frazier/EMAIL-TO-LANDLORD-110-FRAZIER.md
./scripts/pre-send-email-gate.sh docs/110-frazier/EMAIL-TO-AMANDA-REQUEST-APPROVAL.md
```

Optional (when drafts are in Personal folder and ROAM/coherence are needed):

```bash
./scripts/pre-send-email-workflow.sh ~/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/12-AMANDA-BECK-110-FRAZIER/EMAIL-TO-LANDLORD-110-FRAZIER.md
./scripts/pre-send-email-workflow.sh ~/Documents/Personal/CLT/MAA/Uptown/BHOPTI-LEGAL/12-AMANDA-BECK-110-FRAZIER/EMAIL-TO-AMANDA-REQUEST-APPROVAL.md
```

## 2. Confirm amendments (Amanda email)

The Amanda draft explicitly asks her to:

- Confirm she is okay with the five requested redline amendments.
- Confirm that if the landlord accepts, she will sign the lease and send her MAA demand letter.

Do not treat the landlord submission as “validated” for both parties until Amanda confirms.

## 3. Send order

1. Run validation above until both drafts pass (no placeholders, correct N.C.G.S. format).
2. Send **landlord** email first (to allison@amcharlotte.com) with the amendment request.
3. Send **Amanda** email with status and the confirmation request.
4. After Amanda confirms amendments, you can mark R-2026-009 as validated for both; after landlord response, update ROAM per plan (e.g. NEGOTIATING → next step).

## 4. ROAM (R-2026-009)

- Status is already **NEGOTIATING** per consolidation.
- Evidence: lease PDF in `12-AMANDA-BECK-110-FRAZIER/`, redline amendments, emails as sent when done.
