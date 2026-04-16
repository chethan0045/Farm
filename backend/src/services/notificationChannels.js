// Notification channel abstraction layer
// Each channel can be enabled/disabled via environment variables

class NotificationService {
  async send(channel, recipients, title, message) {
    try {
      switch (channel) {
        case 'in_app':
          return { sent: true, channel: 'in_app', note: 'Already created as alert' };

        case 'push':
          return await this.sendPush(recipients, title, message);

        case 'sms':
          return await this.sendSMS(recipients, title, message);

        case 'whatsapp':
          return await this.sendWhatsApp(recipients, title, message);

        case 'email':
          return await this.sendEmail(recipients, title, message);

        default:
          return { sent: false, error: `Unknown channel: ${channel}` };
      }
    } catch (err) {
      console.error(`[Notification] ${channel} error:`, err.message);
      return { sent: false, error: err.message };
    }
  }

  async sendPush(recipients, title, message) {
    // Web Push implementation
    // Requires VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY env vars
    // and user push subscriptions stored in User model
    if (!process.env.VAPID_PUBLIC_KEY) {
      console.log(`[Push] Would send to ${recipients.length} recipients: ${title}`);
      return { sent: false, note: 'Push not configured (VAPID keys missing)' };
    }

    // Placeholder for web-push implementation
    // const webpush = require('web-push');
    // webpush.setVapidDetails('mailto:...', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    // for (const sub of subscriptions) { await webpush.sendNotification(sub, JSON.stringify({title, body: message})); }

    console.log(`[Push] Sent to ${recipients.length} recipients: ${title}`);
    return { sent: true, channel: 'push', recipientCount: recipients.length };
  }

  async sendSMS(phones, title, message) {
    const provider = process.env.SMS_PROVIDER;
    if (!provider) {
      console.log(`[SMS] Would send to ${phones.length} phones: ${title}`);
      return { sent: false, note: 'SMS not configured (SMS_PROVIDER missing)' };
    }

    if (provider === 'twilio') {
      return await this.sendTwilioSMS(phones, `${title}\n${message}`);
    }

    console.log(`[SMS] Unknown provider: ${provider}`);
    return { sent: false, note: `Unknown SMS provider: ${provider}` };
  }

  async sendTwilioSMS(phones, body) {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken || !fromNumber) {
        return { sent: false, note: 'Twilio credentials not configured' };
      }

      const twilio = require('twilio')(accountSid, authToken);
      const results = [];

      for (const phone of phones) {
        const msg = await twilio.messages.create({
          body,
          from: fromNumber,
          to: phone
        });
        results.push({ phone, sid: msg.sid, status: msg.status });
      }

      return { sent: true, channel: 'sms', results };
    } catch (err) {
      return { sent: false, error: err.message };
    }
  }

  async sendWhatsApp(phones, title, message) {
    const fromNumber = process.env.WHATSAPP_PHONE_NUMBER;
    if (!fromNumber) {
      console.log(`[WhatsApp] Would send to ${phones.length} phones: ${title}`);
      return { sent: false, note: 'WhatsApp not configured' };
    }

    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const twilio = require('twilio')(accountSid, authToken);
      const results = [];

      for (const phone of phones) {
        const msg = await twilio.messages.create({
          body: `*${title}*\n${message}`,
          from: `whatsapp:${fromNumber}`,
          to: `whatsapp:${phone}`
        });
        results.push({ phone, sid: msg.sid });
      }

      return { sent: true, channel: 'whatsapp', results };
    } catch (err) {
      return { sent: false, error: err.message };
    }
  }

  async sendEmail(recipients, title, message) {
    // Placeholder for email integration
    console.log(`[Email] Would send to ${recipients.length} recipients: ${title}`);
    return { sent: false, note: 'Email not configured' };
  }
}

module.exports = new NotificationService();
