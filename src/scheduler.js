// src/scheduler.js
const cron = require('node-cron');
const { sequelize } = require('./models'); // ton instance sequelize
const { processDailyQuestions } = require('./lib/questionDistributionOptimized'); // la fonction qu'on a construite
const DAILY_HOUR = 7;

const startScheduler = async () => {

  // Cron tous les jours à 07h00
  cron.schedule('0 7 * * *', async () => {
    console.log("⏰ Exécution planifiée 07h00");
    await runDailyJob();
  }, {
    timezone: "Africa/Kinshasa" // très important pour le RDC
  });

  // Vérifie au lancement si 07h est déjà passé
  await checkImmediateExecution();
};

const checkImmediateExecution = async () => {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const sevenAM = new Date();
  sevenAM.setHours(DAILY_HOUR, 0, 0, 0);

  // Vérifier si job déjà exécuté aujourd'hui
  const alreadyExecuted = await sequelize.query(`
    SELECT 1 FROM daily_job_logs
    WHERE job_name = 'daily_question_job'
    AND date = :today
  `, {
    replacements: { today },
    type: sequelize.QueryTypes.SELECT
  });

  if (alreadyExecuted.length > 0) {
    console.log("✅ Job déjà exécuté aujourd'hui");
    return;
  }

  if (now >= sevenAM) {
    console.log("🚀 07h déjà passée → exécution immédiate");
    await runDailyJob();
  }
};

const runDailyJob = async () => {
  const today = new Date().toISOString().split('T')[0];
  console.log("🚀 Lancement du job journalier...");

  await processDailyQuestions();

  // Log execution
  await sequelize.query(`
    INSERT INTO daily_job_logs (job_name, date)
    VALUES ('daily_question_job', :today)
    ON CONFLICT (job_name, date) DO NOTHING
  `, {
    replacements: { today }
  });

  console.log("✅ Job journalier terminé");
};

startScheduler();

//processDailyQuestions()