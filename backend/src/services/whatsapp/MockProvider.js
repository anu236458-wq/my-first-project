const WhatsAppProvider = require('./WhatsAppProvider');

class MockProvider extends WhatsAppProvider {
  constructor() {
    super('Mock Dev WhatsApp Provider');
  }

  async sendTemplateMessage({ to, templateName, languageCode, parameters = [], fallbackText }) {
    console.log(`\n================== [MOCK WHATSAPP OUTBOUND] ==================`);
    console.log(`📱 Recipient: ${to}`);
    console.log(`📋 Template:  ${templateName} (${languageCode})`);
    console.log(`💬 Message:   ${fallbackText}`);
    console.log(`==============================================================\n`);

    // Simulate invalid phone number failure for testing retry & wa.me fallback
    if (to.endsWith('0000') || to.includes('invalid')) {
      return {
        success: false,
        status: 'Failed',
        error: 'Simulated failure: Recipient phone number unreachable or not on WhatsApp'
      };
    }

    // Simulate successful dispatch
    const fakeMessageId = `mock_msg_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    return {
      success: true,
      status: 'Sent',
      messageId: fakeMessageId
    };
  }

  async checkHealth() {
    return {
      provider: this.name,
      configured: true,
      mode: 'DEVELOPMENT_MOCK',
      healthy: true,
      note: 'Simulates WhatsApp messages in server logs with zero third-party dependencies'
    };
  }
}

module.exports = MockProvider;
