const config = require('../../config');
const db = require('../../db');
const { formatWhatsAppNumber, getWhatsAppDirectLink } = require('../../utils/phoneValidator');

const MetaCloudProvider = require('./MetaCloudProvider');
const MockProvider = require('./MockProvider');
const GupshupProvider = require('./GupshupProvider');
const WatiProvider = require('./WatiProvider');
const InteraktProvider = require('./InteraktProvider');
const AiSensyProvider = require('./AiSensyProvider');

let activeProviderInstance = null;

function getWhatsAppProvider() {
  if (activeProviderInstance) {
    return activeProviderInstance;
  }

  const providerType = config.whatsapp.provider;

  switch (providerType) {
    case 'meta':
      activeProviderInstance = new MetaCloudProvider(config.whatsapp.meta);
      break;
    case 'gupshup':
      activeProviderInstance = new GupshupProvider(config.whatsapp.gupshup);
      break;
    case 'wati':
      activeProviderInstance = new WatiProvider(config.whatsapp.wati);
      break;
    case 'interakt':
      activeProviderInstance = new InteraktProvider(config.whatsapp.interakt);
      break;
    case 'aisensy':
      activeProviderInstance = new AiSensyProvider(config.whatsapp.aisensy);
      break;
    case 'mock':
    default:
      activeProviderInstance = new MockProvider();
      break;
  }

  console.log(`[WhatsApp Service] Initialized active provider: ${activeProviderInstance.name}`);
  return activeProviderInstance;
}

/**
 * Format a human-readable date string e.g. "15 Nov 2026"
 */
function formatDateLabel(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Send Absence WhatsApp Alert to a single student's parent
 */
async function sendAbsenceAlert({ student, batch, date, senderUser }) {
  const provider = getWhatsAppProvider();
  const instituteName = config.institute.name;
  const formattedDate = formatDateLabel(date);

  const cleanPhone = formatWhatsAppNumber(student.parent_phone);

  // Template: "Dear {{1}}, {{2}} was absent from {{3}} on {{4}}. - {{5}}"
  const parameters = [
    student.parent_name || 'Parent',
    student.name,
    batch.name || 'Class',
    formattedDate,
    instituteName
  ];

  const fallbackText = `Dear ${student.parent_name || 'Parent'}, ${student.name} was absent from ${batch.name || 'Class'} on ${formattedDate}. - ${instituteName}`;
  const directWhatsAppLink = cleanPhone ? getWhatsAppDirectLink(cleanPhone, fallbackText) : null;

  if (!cleanPhone) {
    const errorMsg = `Invalid or unformatted parent phone number: ${student.parent_phone}`;
    const insertRes = await db.query(
      `INSERT INTO message_logs (student_id, batch_id, date, recipient_phone, template_used, message_body, status, provider, error_reason, sent_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [student.id, batch.id, date, student.parent_phone || 'None', 'student_absence_alert', fallbackText, 'Failed', provider.name, errorMsg, senderUser ? senderUser.id : null]
    );

    return {
      logId: insertRes.rows[0]?.id,
      studentId: student.id,
      studentName: student.name,
      rollNo: student.roll_no,
      parentName: student.parent_name,
      parentPhone: student.parent_phone,
      status: 'Failed',
      error: errorMsg,
      directLink: null
    };
  }

  // Attempt sending through provider
  let sendResult;
  try {
    sendResult = await provider.sendTemplateMessage({
      to: cleanPhone,
      templateName: config.whatsapp.meta.templateName || 'student_absence_alert',
      languageCode: config.whatsapp.meta.languageCode || 'en_US',
      parameters,
      fallbackText
    });
  } catch (err) {
    sendResult = {
      success: false,
      status: 'Failed',
      error: `Provider execution exception: ${err.message}`
    };
  }

  // Record in message_logs table
  const insertRes = await db.query(
    `INSERT INTO message_logs (student_id, batch_id, date, recipient_phone, template_used, message_body, status, provider, provider_message_id, error_reason, sent_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [
      student.id,
      batch.id,
      date,
      cleanPhone,
      config.whatsapp.meta.templateName || 'student_absence_alert',
      fallbackText,
      sendResult.status || (sendResult.success ? 'Sent' : 'Failed'),
      provider.name,
      sendResult.messageId || null,
      sendResult.error || null,
      senderUser ? senderUser.id : null
    ]
  );

  return {
    logId: insertRes.rows[0]?.id,
    studentId: student.id,
    studentName: student.name,
    rollNo: student.roll_no,
    parentName: student.parent_name,
    parentPhone: cleanPhone,
    status: sendResult.status || (sendResult.success ? 'Sent' : 'Failed'),
    error: sendResult.error || null,
    directLink: directWhatsAppLink
  };
}

/**
 * Retry sending a previously failed message log
 */
async function retryMessage(logId, senderUser) {
  const logRes = await db.query(`SELECT * FROM message_logs WHERE id = $1`, [logId]);
  if (!logRes.rows.length) {
    throw new Error('Message log record not found');
  }

  const log = logRes.rows[0];
  const studentRes = await db.query(`SELECT * FROM students WHERE id = $1`, [log.student_id]);
  const batchRes = await db.query(`SELECT * FROM batches WHERE id = $1`, [log.batch_id]);

  if (!studentRes.rows.length || !batchRes.rows.length) {
    throw new Error('Associated student or batch not found');
  }

  return sendAbsenceAlert({
    student: studentRes.rows[0],
    batch: batchRes.rows[0],
    date: log.date,
    senderUser
  });
}

module.exports = {
  getWhatsAppProvider,
  sendAbsenceAlert,
  retryMessage,
  formatDateLabel
};
