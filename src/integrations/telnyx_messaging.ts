/**
 * Telnyx SMS/IVR Integration for Sovereign Swarm Platform
 *
 * Bridges Telnyx programmable messaging with:
 *   - Symfony Affiliate Communication (opt-in group management)
 *   - OroCRM (contact records, first_name personalization)
 *   - WordPress multisite (subscriber lists, WooCommerce orders)
 *   - Flarum (forum user notifications)
 *   - HostBill (billing alerts, service notifications)
 *
 * Features:
 *   - Personalized SMS with {{first_name}} template injection
 *   - Group-based messaging (opt-in segments)
 *   - IVR flow builder (menu trees, TTS prompts)
 *   - Webhook receiver for delivery reports
 *   - Credit budget tracking per tenant
 *
 * Environment:
 *   TELNYX_API_KEY      — API v2 key
 *   TELNYX_MSG_PROFILE  — Messaging profile ID (TAGtest: f7032d43-...)
 *   TELNYX_FROM_NUMBER  — Default sender (+19802840009)
 *   TELNYX_CONNECTION_ID — FQDN connection ID for voice
 *
 * DoR: Telnyx SIP connection active, messaging profile exists, number assigned
 * DoD: SMS sends with personalization, delivery webhooks received, budget tracked
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types
// ============================================================================

export interface Contact {
  id: string;
  first_name: string;
  last_name?: string;
  phone: string;              // E.164 format: +1XXXXXXXXXX
  email?: string;
  groups: string[];           // opt-in segment tags
  source: ContactSource;      // which platform they came from
  opted_in: boolean;
  opted_in_at?: string;       // ISO timestamp
  metadata?: Record<string, unknown>;
}

export type ContactSource =
  | 'symfony_affiliate'
  | 'orocrm'
  | 'wordpress'
  | 'flarum'
  | 'hostbill'
  | 'manual';

export interface MessageTemplate {
  id: string;
  name: string;
  body: string;               // Supports {{first_name}}, {{last_name}}, {{custom.*}}
  type: 'sms' | 'mms';
  groups: string[];           // which groups receive this template
  metadata?: Record<string, unknown>;
}

export interface SendResult {
  contact_id: string;
  phone: string;
  message_id?: string;
  status: 'sent' | 'failed' | 'skipped';
  error?: string;
  cost?: number;
}

export interface IVRNode {
  id: string;
  type: 'greeting' | 'menu' | 'transfer' | 'voicemail' | 'tts';
  text: string;               // TTS text or SSML
  options?: Record<string, string>;  // DTMF digit → next node ID
  transfer_to?: string;       // phone number for transfer
  timeout_seconds?: number;
}

export interface BudgetTracker {
  tenant_id: string;
  daily_limit_cents: number;
  spent_today_cents: number;
  total_messages_today: number;
  last_reset: string;
}

// ============================================================================
// Telnyx Messaging Client
// ============================================================================

export class TelnyxMessaging extends EventEmitter {
  private apiKey: string;
  private msgProfileId: string;
  private fromNumber: string;
  private connectionId: string;
  private baseUrl = 'https://api.telnyx.com/v2';
  private budgets: Map<string, BudgetTracker> = new Map();

  constructor(config?: {
    apiKey?: string;
    msgProfileId?: string;
    fromNumber?: string;
    connectionId?: string;
  }) {
    super();
    this.apiKey = config?.apiKey || process.env.TELNYX_API_KEY || '';
    this.msgProfileId = config?.msgProfileId || process.env.TELNYX_MSG_PROFILE || 'f7032d43-1456-4cd7-832a-f59de944699b';
    this.fromNumber = config?.fromNumber || process.env.TELNYX_FROM_NUMBER || '+19802840009';
    this.connectionId = config?.connectionId || process.env.TELNYX_CONNECTION_ID || '2959201636066526909';
  }

  // --------------------------------------------------------------------------
  // Template Engine
  // --------------------------------------------------------------------------

  /**
   * Interpolate template variables: {{first_name}}, {{last_name}}, {{custom.X}}
   */
  renderTemplate(template: string, contact: Contact, extra?: Record<string, string>): string {
    let rendered = template;
    rendered = rendered.replace(/\{\{first_name\}\}/gi, contact.first_name || 'there');
    rendered = rendered.replace(/\{\{last_name\}\}/gi, contact.last_name || '');
    rendered = rendered.replace(/\{\{phone\}\}/gi, contact.phone);
    rendered = rendered.replace(/\{\{email\}\}/gi, contact.email || '');

    // Custom variables: {{custom.key}}
    if (extra) {
      for (const [key, value] of Object.entries(extra)) {
        rendered = rendered.replace(new RegExp(`\\{\\{custom\\.${key}\\}\\}`, 'gi'), value);
      }
    }

    // Clean up any remaining unreplaced tokens
    rendered = rendered.replace(/\{\{[^}]+\}\}/g, '');
    return rendered.trim();
  }

  // --------------------------------------------------------------------------
  // SMS Sending
  // --------------------------------------------------------------------------

  /**
   * Send SMS to a single contact with personalized template
   */
  async sendSMS(contact: Contact, template: MessageTemplate, extra?: Record<string, string>): Promise<SendResult> {
    if (!contact.opted_in) {
      return { contact_id: contact.id, phone: contact.phone, status: 'skipped', error: 'not opted in' };
    }

    // Budget check
    const budget = this.getBudget(contact.source);
    if (budget && budget.spent_today_cents >= budget.daily_limit_cents) {
      return { contact_id: contact.id, phone: contact.phone, status: 'skipped', error: 'daily budget exceeded' };
    }

    const body = this.renderTemplate(template.body, contact, extra);

    try {
      const response = await this.apiCall('POST', '/messages', {
        from: this.fromNumber,
        to: contact.phone,
        text: body,
        messaging_profile_id: this.msgProfileId,
        type: template.type === 'mms' ? 'MMS' : 'SMS',
      });

      const msgId = response?.data?.id;
      const cost = parseFloat(response?.data?.cost?.amount || '0.004') * 100; // cents

      // Track budget
      if (budget) {
        budget.spent_today_cents += cost;
        budget.total_messages_today += 1;
      }

      this.emit('sms:sent', { contact_id: contact.id, message_id: msgId, body });

      return {
        contact_id: contact.id,
        phone: contact.phone,
        message_id: msgId,
        status: 'sent',
        cost: cost / 100,
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.emit('sms:failed', { contact_id: contact.id, error: errMsg });
      return { contact_id: contact.id, phone: contact.phone, status: 'failed', error: errMsg };
    }
  }

  /**
   * Send personalized SMS to a group of contacts
   */
  async sendToGroup(
    contacts: Contact[],
    template: MessageTemplate,
    groupFilter?: string,
    extra?: Record<string, string>,
  ): Promise<SendResult[]> {
    const filtered = groupFilter
      ? contacts.filter(c => c.groups.includes(groupFilter) && c.opted_in)
      : contacts.filter(c => c.opted_in);

    const results: SendResult[] = [];

    for (const contact of filtered) {
      const result = await this.sendSMS(contact, template, extra);
      results.push(result);

      // Rate limit: 1 msg/100ms to stay under Telnyx limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const sent = results.filter(r => r.status === 'sent').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;

    this.emit('group:complete', { group: groupFilter, sent, failed, skipped, total: filtered.length });

    return results;
  }

  // --------------------------------------------------------------------------
  // IVR / Voice
  // --------------------------------------------------------------------------

  /**
   * Initiate an outbound call with IVR menu
   */
  async initiateIVRCall(to: string, greeting: string): Promise<{ call_id?: string; error?: string }> {
    try {
      const response = await this.apiCall('POST', '/calls', {
        connection_id: this.connectionId,
        to,
        from: this.fromNumber,
        answering_machine_detection: 'detect',
        webhook_url: process.env.TELNYX_WEBHOOK_URL,
      });

      return { call_id: response?.data?.call_control_id };
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Send TTS speak command on active call
   */
  async speakOnCall(callControlId: string, text: string, voice = 'female'): Promise<void> {
    await this.apiCall('POST', `/calls/${callControlId}/actions/speak`, {
      payload: text,
      voice,
      language: 'en-US',
    });
  }

  /**
   * Gather DTMF input on active call
   */
  async gatherDTMF(callControlId: string, prompt: string, maxDigits = 1): Promise<void> {
    await this.apiCall('POST', `/calls/${callControlId}/actions/gather`, {
      minimum_digits: 1,
      maximum_digits: maxDigits,
      timeout_millis: 10000,
      inter_digit_timeout_millis: 5000,
      initial_timeout_millis: 10000,
      valid_digits: '0123456789*#',
    });
  }

  // --------------------------------------------------------------------------
  // Platform Adapters (Symfony/Oro/WordPress/Flarum/HostBill)
  // --------------------------------------------------------------------------

  /**
   * Import contacts from OroCRM API
   */
  async importFromOroCRM(apiUrl: string, apiKey: string): Promise<Contact[]> {
    // OroCRM REST API: GET /api/contacts
    const contacts: Contact[] = [];
    try {
      const res = await fetch(`${apiUrl}/api/contacts?page[size]=100`, {
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/vnd.api+json' },
      });
      const data = await res.json();
      for (const c of data?.data || []) {
        const attrs = c.attributes || {};
        const phones = attrs.phones || [];
        if (phones.length > 0) {
          contacts.push({
            id: `oro-${c.id}`,
            first_name: attrs.firstName || '',
            last_name: attrs.lastName || '',
            phone: phones[0]?.phone || '',
            email: attrs.primaryEmail || '',
            groups: ['orocrm', ...(attrs.tags || [])],
            source: 'orocrm',
            opted_in: true, // requires explicit opt-in verification
          });
        }
      }
    } catch (e) {
      console.warn('[TelnyxMessaging] OroCRM import failed:', e);
    }
    return contacts;
  }

  /**
   * Import subscribers from WordPress REST API
   */
  async importFromWordPress(siteUrl: string, appPassword: string): Promise<Contact[]> {
    const contacts: Contact[] = [];
    try {
      const res = await fetch(`${siteUrl}/wp-json/wp/v2/users?per_page=100&context=edit`, {
        headers: { Authorization: `Basic ${Buffer.from(`admin:${appPassword}`).toString('base64')}` },
      });
      const users = await res.json();
      for (const u of users) {
        if (u.meta?.phone) {
          contacts.push({
            id: `wp-${u.id}`,
            first_name: u.first_name || u.name || '',
            last_name: u.last_name || '',
            phone: u.meta.phone,
            email: u.email,
            groups: ['wordpress', ...(u.roles || [])],
            source: 'wordpress',
            opted_in: !!u.meta?.sms_opt_in,
          });
        }
      }
    } catch (e) {
      console.warn('[TelnyxMessaging] WordPress import failed:', e);
    }
    return contacts;
  }

  /**
   * Import users from Flarum API
   */
  async importFromFlarum(siteUrl: string, apiKey: string): Promise<Contact[]> {
    const contacts: Contact[] = [];
    try {
      const res = await fetch(`${siteUrl}/api/users?page[limit]=100`, {
        headers: { Authorization: `Token ${apiKey}; userId=1` },
      });
      const data = await res.json();
      for (const u of data?.data || []) {
        const attrs = u.attributes || {};
        if (attrs.phone) {
          contacts.push({
            id: `flarum-${u.id}`,
            first_name: attrs.displayName || attrs.username || '',
            phone: attrs.phone,
            email: attrs.email,
            groups: ['flarum', 'community'],
            source: 'flarum',
            opted_in: !!attrs.smsOptIn,
          });
        }
      }
    } catch (e) {
      console.warn('[TelnyxMessaging] Flarum import failed:', e);
    }
    return contacts;
  }

  // --------------------------------------------------------------------------
  // Budget Management
  // --------------------------------------------------------------------------

  getBudget(tenantId: string): BudgetTracker | undefined {
    return this.budgets.get(tenantId);
  }

  setBudget(tenantId: string, dailyLimitCents: number): void {
    const existing = this.budgets.get(tenantId);
    const today = new Date().toISOString().slice(0, 10);

    if (existing && existing.last_reset === today) {
      existing.daily_limit_cents = dailyLimitCents;
    } else {
      this.budgets.set(tenantId, {
        tenant_id: tenantId,
        daily_limit_cents: dailyLimitCents,
        spent_today_cents: 0,
        total_messages_today: 0,
        last_reset: today,
      });
    }
  }

  getBudgetSummary(): Record<string, BudgetTracker> {
    const summary: Record<string, BudgetTracker> = {};
    for (const [k, v] of this.budgets) {
      summary[k] = { ...v };
    }
    return summary;
  }

  // --------------------------------------------------------------------------
  // Webhook Handler (for delivery reports)
  // --------------------------------------------------------------------------

  /**
   * Process Telnyx webhook event (call from Express/Fastify route handler)
   */
  handleWebhook(event: Record<string, unknown>): void {
    const eventType = (event?.data as Record<string, unknown>)?.event_type as string;
    const payload = (event?.data as Record<string, unknown>)?.payload as Record<string, unknown>;

    switch (eventType) {
      case 'message.sent':
        this.emit('webhook:sent', payload);
        break;
      case 'message.finalized':
        this.emit('webhook:delivered', payload);
        break;
      case 'message.failed':
        this.emit('webhook:failed', payload);
        break;
      case 'call.initiated':
        this.emit('webhook:call_initiated', payload);
        break;
      case 'call.answered':
        this.emit('webhook:call_answered', payload);
        break;
      case 'call.gather.ended':
        this.emit('webhook:dtmf', payload);
        break;
      default:
        this.emit('webhook:unknown', { eventType, payload });
    }
  }

  // --------------------------------------------------------------------------
  // API Helper
  // --------------------------------------------------------------------------

  private async apiCall(method: string, path: string, body?: Record<string, unknown>): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Telnyx API ${method} ${path} failed (${response.status}): ${errBody}`);
    }
    return response.json();
  }
}

// ============================================================================
// Pre-built Templates
// ============================================================================

export const DEFAULT_TEMPLATES: MessageTemplate[] = [
  {
    id: 'welcome',
    name: 'Welcome Message',
    body: 'Hi {{first_name}}! Welcome to TAG. Reply STOP to opt out.',
    type: 'sms',
    groups: ['new_signup'],
  },
  {
    id: 'billing_reminder',
    name: 'Billing Reminder',
    body: 'Hi {{first_name}}, your invoice is ready. View at {{custom.invoice_url}}',
    type: 'sms',
    groups: ['hostbill', 'billing'],
  },
  {
    id: 'vote_notification',
    name: 'Vote Notification',
    body: '🗳️ {{first_name}}, a new vote is live on tag.vote: "{{custom.proposal}}". Cast your vote now!',
    type: 'sms',
    groups: ['tag_vote', 'community'],
  },
  {
    id: 'affiliate_update',
    name: 'Affiliate Commission Update',
    body: 'Hey {{first_name}}! Your affiliate commission of ${{custom.amount}} has been processed. 🎉',
    type: 'sms',
    groups: ['affiliate', 'symfony_affiliate'],
  },
  {
    id: 'forum_mention',
    name: 'Forum Mention',
    body: '{{first_name}}, you were mentioned in a Flarum discussion: "{{custom.topic}}". Check it out!',
    type: 'sms',
    groups: ['flarum', 'community'],
  },
  {
    id: 'job_match',
    name: 'SummerJobSwap Match',
    body: 'Hi {{first_name}}! A new job match: "{{custom.job_title}}" at {{custom.company}}. Apply now at summerjobswap.com',
    type: 'sms',
    groups: ['summerjobswap', 'job_seekers'],
  },
];

// ============================================================================
// Factory
// ============================================================================

let _instance: TelnyxMessaging | null = null;

export function getTelnyxMessaging(): TelnyxMessaging {
  if (!_instance) {
    _instance = new TelnyxMessaging();
  }
  return _instance;
}

export function resetTelnyxMessaging(): void {
  _instance = null;
}
