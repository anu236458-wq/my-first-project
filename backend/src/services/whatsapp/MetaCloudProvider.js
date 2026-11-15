const WhatsAppProvider = require('./WhatsAppProvider');

class MetaCloudProvider extends WhatsAppProvider {
  constructor(config) {
    super('Meta WhatsApp Business Cloud API');
    this.phoneNumberId = config.phoneNumberId;
    this.token = config.token;
    this.defaultTemplate = config.templateName || 'student_absence_alert';
    this.defaultLanguage = config.languageCode || 'en_US';
    this.apiVersion = 'v19.0';
  }

  async sendTemplateMessage({ to, templateName, languageCode, parameters = [], fallbackText }) {
    if (!this.phoneNumberId || !this.token || this.token === 'mock_access_token') {
      return {
        success: false,
        status: 'Failed',
        error: 'Meta WhatsApp credentials missing or not configured in environment variables (META_PHONE_NUMBER_ID, META_WHATSAPP_TOKEN).'
      };
    }

    // Clean recipient phone: Meta expects digits without the '+' sign
    const recipientDigits = to.replace(/\+/g, '').trim();

    // Build template components payload
    const bodyParameters = parameters.map(param => ({
      type: 'text',
      text: String(param)
    }));

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipientDigits,
      type: 'template',
      template: {
        name: templateName || this.defaultTemplate,
        language: {
          code: languageCode || this.defaultLanguage
        },
        components: [
          {
            type: 'body',
            parameters: bodyParameters
          }
        ]
      }
    };

    try {
      const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        const errorDetail = data?.error?.message || 'Meta API returned an error';
        console.error(`[Meta WhatsApp] Send failure to ${to}:`, errorDetail);
        return {
          success: false,
          status: 'Failed',
          error: errorDetail
        };
      }

      const messageId = data?.messages?.[0]?.id || `wamid_${Date.now()}`;
      return {
        success: true,
        status: 'Sent',
        messageId
      };
    } catch (err) {
      console.error(`[Meta WhatsApp] Network/API Error sending to ${to}:`, err.message);
      return {
        success: false,
        status: 'Failed',
        error: `Network error connecting to Meta WhatsApp API: ${err.message}`
      };
    }
  }

  async checkHealth() {
    const isConfigured = Boolean(this.phoneNumberId && this.token && this.token !== 'mock_access_token');
    return {
      provider: this.name,
      configured: isConfigured,
      phoneNumberId: this.phoneNumberId ? `***${this.phoneNumberId.slice(-4)}` : 'Not set',
      healthy: isConfigured
    };
  }
}

module.exports = MetaCloudProvider;
