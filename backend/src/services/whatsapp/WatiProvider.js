const WhatsAppProvider = require('./WhatsAppProvider');

class WatiProvider extends WhatsAppProvider {
  constructor(config) {
    super('WATI WhatsApp API');
    this.endpoint = config.endpoint;
    this.token = config.token;
  }

  async sendTemplateMessage({ to, templateName, languageCode, parameters = [], fallbackText }) {
    if (!this.endpoint || !this.token) {
      return { success: false, status: 'Failed', error: 'WATI credentials missing (WATI_API_ENDPOINT, WATI_ACCESS_TOKEN)' };
    }

    try {
      const cleanPhone = to.replace(/\+/g, '').trim();
      const customParams = parameters.map((val, idx) => ({ name: String(idx + 1), value: String(val) }));
      const response = await fetch(`${this.endpoint}/api/v1/sendTemplateMessage?whatsappNumber=${cleanPhone}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          template_name: templateName,
          broadcast_name: `absent_alert_${Date.now()}`,
          parameters: customParams
        })
      });

      const data = await response.json();
      if (response.ok && data.result) {
        return { success: true, status: 'Sent', messageId: data.model?.id || `wati_${Date.now()}` };
      }
      return { success: false, status: 'Failed', error: data.info || 'WATI API error' };
    } catch (err) {
      return { success: false, status: 'Failed', error: `WATI request failed: ${err.message}` };
    }
  }
}

module.exports = WatiProvider;
