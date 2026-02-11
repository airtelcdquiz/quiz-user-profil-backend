
// src/utils/smsQueue.js
const Queue = require('bull');
const REDIS_URL = 'redis://ussd-redis:6379';

// Création de la queue
const smsQueue = new Queue('sms_queue', REDIS_URL);

/**
 * Déposer un SMS dans la queue
 * @param {string} phoneNumber
 * @param {string} message
 * @param {object} meta
 */
async function enqueueSMS(phoneNumber, message, meta = {}) {
  const job = await smsQueue.add({
    phoneNumber,
    message,
    meta,
  }, {
    attempts: 5,       // retry automatique jusqu'à 5 fois
    backoff: 5000,     // 5s entre chaque retry
  });
  return job.id;
}

module.exports = {
  smsQueue,
  enqueueSMS,
};
