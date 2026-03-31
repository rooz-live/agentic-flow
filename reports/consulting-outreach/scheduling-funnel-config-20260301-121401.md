# Cal.rooz.live Scheduling Funnel Configuration

## 1. Cal.com Event Configuration (JSON)

```json
{
  "eventType": {
    "title": "15-min Discovery Call (Agentics Consulting)",
    "slug": "discovery-call-agentics",
    "length": 15,
    "description": "Quick discovery call to discuss your AI/agent automation needs and explore how we can help accelerate your project.",
    "locations": [
      {
        "type": "integrations:zoom"
      }
    ],
    "availability": {
      "urgent_period": {
        "dateRange": {
          "start": "2024-03-01",
          "end": "2024-03-02"
        },
        "schedule": [
          {
            "days": [1, 2, 3, 4, 5],
            "startTime": "09:00",
            "endTime": "17:00"
          }
        ]
      },
      "regular_schedule": {
        "dateRange": {
          "start": "2024-03-03",
          "end": null
        },
        "schedule": [
          {
            "days": [1, 2, 3, 4, 5],
            "startTime": "09:00",
            "endTime": "17:00"
          }
        ]
      }
    },
    "beforeEventBuffer": 15,
    "afterEventBuffer": 15,
    "bookingFields": [
      {
        "name": "ai_challenge",
        "type": "textarea",
        "label": "What AI/agent challenge are you facing?",
        "required": true,
        "placeholder": "Describe your current AI/automation challenge or opportunity..."
      },
      {
        "name": "timeline",
        "type": "select",
        "label": "Timeline for project?",
        "required": true,
        "options": [
          "Immediate (within 1 week)",
          "1-2 weeks",
          "1-2 months",
          "Exploring options"
        ]
      },
      {
        "name": "budget_range",
        "type": "select",
        "label": "Budget range?",
        "required": true,
        "options": [
          "$1,000 - $5,000",
          "$5,000 - $10,000",
          "$10,000 - $25,000",
          "$25,000+"
        ]
      }
    ],
    "requiresConfirmation": false,
    "disableGuests": true,
    "hideCalendarNotes": true
  }
}
```

## 2. Confirmation Email Template

**Subject:** `Confirmed: 15-min Discovery Call on [date] at [time] EST`

**Body:**
```html
Hi [name],

Your 15-minute Discovery Call is confirmed for:
📅 [date] at [time] EST
🔗 [meeting_link]

## What to Expect:
• Quick 15-minute scope discussion of your AI/agent challenge
• Assessment of project fit and timeline
• Introduction to our $75/hr consulting approach
• Next steps if we're a good match

## Before Our Call:
Please review the challenge you described: "[ai_challenge]"
Think about your ideal outcome and any technical constraints.

## About Rooz:
📊 Portfolio: https://cv.rooz.live
🔧 Recent Work: https://github.com/rooz/agentic-flow

Looking forward to exploring how we can accelerate your AI project!

Best regards,
Rooz

---
Need to reschedule? Use this link: [reschedule_link]
Questions? Reply to this email.
```

## 3. Capacity Planning & Forecast

### March 1-2 (Urgent Period)
```
📊 URGENT CAPACITY SETUP
├── Available Slots: 4 per day × 2 days = 8 total slots
├── Slot Times: 9:00, 10:30, 12:00, 1:30, 3:00, 4:30 EST
└── Buffer: 15min between calls (15min call + 15min buffer = 30min blocks)

🎯 BOOKING PROJECTIONS
├── Email Recipients: ~10-15 prospects
├── Expected Booking Rate: 30%
├── Projected Bookings: 3-5 calls
└── Expected Conversion: 50% → 1-2 signed contracts
```

### Regular Schedule (March 3+)
```
📅 ONGOING CAPACITY
├── Monday-Friday: 9am-5pm EST
├── Available Slots: 16 per day (30min blocks)
├── Recommended Booking Limit: 8 slots/day (50% utilization)
└── Weekly Capacity: 40 discovery calls maximum

📈 WEEKLY PROJECTIONS
├── Target Bookings: 10-15 calls/week
├── Expected Conversions: 5-7 contracts/week
├── Revenue Potential: $375-525/week (discovery conversion)
└── Follow-up Project Value: $1,000-25,000+ per contract
```

## 4. Implementation Checklist

- [ ] Create event type in Cal.com with above JSON config
- [ ] Test booking flow with all form fields
- [ ] Set up Zoom integration for auto-generated meeting links
- [ ] Configure confirmation email template
- [ ] Set urgent availability for March 1-2
- [ ] Test email notifications and meeting link generation
- [ ] Prepare discovery call script/checklist
- [ ] Set up CRM tracking for booking → conversion metrics

**Priority:** March 1-2 slots must be live by February 29th for trial deadline opportunity.
