const WhatsAppProvider = require('./WhatsAppProvider');

class GupshupProvider extends WhatsAppProvider {
  constructor(config) {
    super('Gupshup WhatsApp Enterprise');
    this.apiKey = config.apiKey;
    this.appName = config.appName;
  }

  async sendTemplateMessage({ to, templateName, languageCode, parameters = [], fallbackText }) {
    if (!this.apiKey || !this.appName) {
      return {
        success: false,
        status: 'Failed',
        error: 'Gupshup credentials missing (GUPSHUP_API_KEY, GUPSHUP_APP_NAME)'
      };
    }

    try {
      const cleanPhone = to.replace(/\+/g, '').trim();
      const paramsBody = new URLSearchParams({
        channel: 'whatsapp',
        source: this.appName,
        destination: cleanPhone,
        'src.name': this.appName,
        template: JSON.stringify({
          id: templateName,
          params: parameters
        })
      });

      const response = await fetch('https://api.gupshup.io/sm/api/v1/template/msg', {
        method: 'POST',
        headers: {
          'apikey': this.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: paramsBody.toString()
      });

      const data = await response.json();
      if (response.ok && data.status === 'submitted') {
        return {
          success: true,
          status: 'Sent',
          messageId: data.messageId || `gup_${Date.now()}`
        };
      }

      return {
        success: false,
        status: 'Failed',
        error: data.message || 'Gupshup API dispatch failed'
      };
    } catch (err) {
      return {
        success: false,
        status: 'Failed',
        error: `Gupshup request failed: ${err.message}`
      };
    }
  }
}

module.exports = GupshupProvider;
