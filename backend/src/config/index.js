const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_key_institute_2026',
  jwtExpiresIn: '7d',
  
  db: {
    connectionString: process.env.DATABASE_URL,
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'institute_db',
    useFallback: process.env.USE_SQLITE_FALLBACK === 'true' || true
  },
  
  whatsapp: {
    provider: (process.env.WHATSAPP_PROVIDER || 'mock').toLowerCase(),
    meta: {
      phoneNumberId: process.env.META_PHONE_NUMBER_ID,
      token: process.env.META_WHATSAPP_TOKEN,
      templateName: process.env.META_WHATSAPP_TEMPLATE_NAME || 'student_absence_alert',
      languageCode: process.env.META_WHATSAPP_LANGUAGE_CODE || 'en_US'
    },
    gupshup: {
      apiKey: process.env.GUPSHUP_API_KEY,
      appName: process.env.GUPSHUP_APP_NAME
    },
    wati: {
      endpoint: process.env.WATI_API_ENDPOINT,
      token: process.env.WATI_ACCESS_TOKEN
    },
    interakt: {
      apiKey: process.env.INTERAKT_API_KEY
    },
    aisensy: {
      apiKey: process.env.AISENSY_API_KEY
    }
  },
  
  institute: {
    name: process.env.INSTITUTE_NAME || 'Apex Coaching Institute',
    phone: process.env.INSTITUTE_PHONE || '+919876543210'
  }
};
