const WhatsAppProvider = require('./WhatsAppProvider');

class AiSensyProvider extends WhatsAppProvider {
  constructor(config) {
    super('AiSensy WhatsApp API');
    this.apiKey = config.apiKey;
  }

  async sendTemplateMessage({ to, templateName, languageCode, parameters = [], fallbackText }) {
    if (!this.apiKey) {
      return { success: false, status: 'Failed', error: 'AiSensy API Key missing' };
    }

    try {
      const cleanPhone = to.replace(/\+/g, '').trim();
      const response = await fetch('https://backend.aisensy.com/campaign/t1/api/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey: this.apiKey,
          campaignName: templateName,
          destination: cleanPhone,
          userName: parameters[0] || 'Parent',
          templateParams: parameters
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        return { success: true, status: 'Sent', messageId: data.messageId || `aisensy_${Date.now()}` };
      }
      return { success: false, status: 'Failed', error: data.message || 'AiSensy error' };
    } catch (err) {
      return { success: false, status: 'Failed', error: `AiSensy request failed: ${err.message}` };
    }
  }
}

module.exports = AiSensyProvider;
