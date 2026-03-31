# Reverse Recruiter - Submission Guide

## Prerequisites

1. **Gmail App Password** (not your regular password!)
   - Go to https://myaccount.google.com/apppasswords
   - Create new app password
   - Save it securely

2. **Environment Variables**
   ```bash
   export GMAIL_USER="your.email@gmail.com"
   export GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"  # 16-char app password
   ```

## Option 1: Automated Batch Submission

```bash
# Set environment variables
export GMAIL_USER="your.email@gmail.com"
export GMAIL_APP_PASSWORD="your-app-password"

# Run submission script
cd /Users/shahroozbhopti/Documents/code/investing/agentic-flow/packages/reverse-recruiter
npm run submit
```

**Output**:
```
📧 Submitting 10 applications...
✅ Sent: 720.chat - Senior Attorney (250h consulting)
✅ Sent: TAG.VOTE - Associate Attorney (Pro Se Support)
✅ Sent: O-GOV.com - Managing Partner (100h consulting)
...
✅ Submitted 10/10 applications
```

## Option 2: Manual Submission (First 3 P0 Apps)

If you prefer manual control:

1. **Open tracker**:
   ```bash
   cat ~/Documents/Personal/CLT/MAA/applications.json
   ```

2. **Copy cover letters** for:
   - yo@720.chat (Senior Attorney, 250h, $37.5K)
   - agentic.coach@TAG.VOTE (Associate Attorney, Pro Se Support)
   - purpose@yo.life (Managing Partner, 100h, $15K)

3. **Send via Mail.app** or Gmail web interface

4. **Update tracker**:
   ```json
   {
     "status": "pending" → "status": "submitted",
     "submitted_at": "2026-03-04T02:56:15Z"
   }
   ```

## Verification

Check sent emails:
```bash
# View tracker
cat ~/Documents/Personal/CLT/MAA/applications.json | jq '.applications[] | select(.status == "submitted")'
```

Expected output:
```json
{
  "company": "720.chat",
  "status": "submitted",
  "submitted_at": "2026-03-04T02:56:15Z"
}
```

## Troubleshooting

### Error: "Invalid login"
- Use **App Password**, not regular password
- Check GMAIL_USER matches your Gmail address

### Error: "Connection timeout"
- Check internet connection
- Gmail may block from new locations (check Gmail security alerts)

### Error: "Attachment failed"
- Verify https://cv.rooz.live/resume.pdf is accessible
- Consider local file: `path: '/Users/shahroozbhopti/Documents/resume.pdf'`

## Next Steps

1. **Week 1 Goal**: 25+ applications (current: 10/25, 40%)
2. **Week 2 Goal**: 3+ interview requests (track in tracker)
3. **Week 3 Goal**: 1+ consulting offer ($37.5K target)

## Tracker Schema

```json
{
  "applications": [
    {
      "company": "720.chat",
      "role": "Senior Attorney (250h consulting)",
      "apply_email": "yo@720.chat",
      "cover_letter": "Dear Hiring Manager...",
      "status": "pending|submitted|interview|offer|rejected",
      "submitted_at": "2026-03-04T02:56:15Z",
      "interview_at": null,
      "offer_amount": null
    }
  ]
}
```
