import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';

interface Application {
  company: string;
  role: string;
  apply_email: string;
  cover_letter: string;
  status: string;
  submitted_at?: string;
}

interface Tracker {
  applications: Application[];
}

const TRACKER_PATH = path.join(process.env.HOME!, 'Documents/Personal/CLT/MAA/applications.json');

async function loadTracker(): Promise<Tracker> {
  const data = await fs.readFile(TRACKER_PATH, 'utf-8');
  return JSON.parse(data);
}

async function saveTracker(tracker: Tracker): Promise<void> {
  await fs.writeFile(TRACKER_PATH, JSON.stringify(tracker, null, 2));
}

async function submitApplications() {
  const tracker = await loadTracker();
  const pending = tracker.applications.filter(a => a.status === 'pending');
  
  if (pending.length === 0) {
    console.log('✅ No pending applications to submit');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  console.log(`📧 Submitting ${pending.length} applications...`);

  for (const app of pending) {
    try {
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: app.apply_email,
        subject: `Application: ${app.role} at ${app.company}`,
        text: app.cover_letter,
        attachments: [
          {
            filename: 'resume.pdf',
            path: 'https://cv.rooz.live/resume.pdf'
          }
        ]
      });

      app.status = 'submitted';
      app.submitted_at = new Date().toISOString();
      
      console.log(`✅ Sent: ${app.company} - ${app.role}`);
    } catch (error) {
      console.error(`❌ Failed: ${app.company} - ${app.role}`, error);
      app.status = 'failed';
    }
  }

  await saveTracker(tracker);
  console.log(`✅ Submitted ${pending.filter(a => a.status === 'submitted').length}/${pending.length} applications`);
}

// Run if called directly
if (require.main === module) {
  submitApplications().catch(console.error);
}

export { submitApplications };
