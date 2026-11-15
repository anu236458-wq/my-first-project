const WhatsAppProvider = require('./WhatsAppProvider');

class InteraktProvider extends WhatsAppProvider {
  constructor(config) {
    super('Interakt WhatsApp API');
    this.apiKey = config.apiKey;
  }

  async sendTemplateMessage({ to, templateName, languageCode, parameters = [], fallbackText }) {
    if (!this.apiKey) {
      return { success: false, status: 'Failed', error: 'Interakt API Key missing' };
    }

    try {
      const cleanPhone = to.replace(/\+/g, '').trim();
      const countryCode = cleanPhone.startsWith('91') ? '+91' : '+91';
      const phoneNumber = cleanPhone.replace(/^91/, '');

      const response = await fetch('https://api.interakt.ai/v1/public/message/', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          countryCode,
          phoneNumber,
          type: 'Template',
          template: {
            name: templateName,
            languageCode: languageCode || 'en',
            bodyValues: parameters
          }
        })
      });

      const data = await response.json();
      if (response.ok && data.result) {
        return { success: true, status: 'Sent', messageId: data.id || `interakt_${Date.now()}` };
      }
      return { success: false, status: 'Failed', error: data.message || 'Interakt error' };
    } catch (err) {
      return { success: false, status: 'Failed', error: `Interakt request failed: ${err.message}` };
    }
  }
}

module.exports = InteraktProvider;
