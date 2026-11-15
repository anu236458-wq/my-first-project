/**
 * Base Abstract WhatsApp Provider Interface
 * All WhatsApp providers (Meta, Gupshup, WATI, Interakt, AiSensy, Mock)
 * must implement this contract.
 */
class WhatsAppProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * Send a template message to a recipient
   * @param {Object} options
   * @param {string} options.to - Recipient phone number in E.164 format (+91XXXXXXXXXX)
   * @param {string} options.templateName - Approved template name
   * @param {string} options.languageCode - Language code e.g. 'en_US' or 'hi'
   * @param {Array<string>} options.parameters - Ordered array of template parameter values
   * @param {string} options.fallbackText - Rendered text message for logging/fallbacks
   * @returns {Promise<{ success: boolean, messageId?: string, status: string, error?: string }>}
   */
  async sendTemplateMessage({ to, templateName, languageCode, parameters, fallbackText }) {
    throw new Error(`sendTemplateMessage() is not implemented in ${this.constructor.name}`);
  }

  /**
   * Check connection / credentials health
   */
  async checkHealth() {
    return { provider: this.name, healthy: true };
  }
}

module.exports = WhatsAppProvider;
