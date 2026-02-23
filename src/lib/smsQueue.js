
// src/utils/smsQueue.js
const Queue = require('bull');
const REDIS_URL = 'redis://ussd-redis:6379';

// Création de la queue
const smsQueue = new Queue('sms-queue', REDIS_URL);


async function enqueueBulkSMS(phoneNumber, messages, meta = {}) {
  const job = await smsQueue.add({
    phoneNumber,
    messages,
    meta: {
      type:"bulk-message",
      ...meta
    },
  }, {
    attempts: 5,       // retry automatique jusqu'à 5 fois
    backoff: 5000,     // 5s entre chaque retry
  });
  return job.id;
}

module.exports = {
  smsQueue, 
  enqueueBulkSMS
};
