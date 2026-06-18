const { Op, literal } = require('sequelize');
const { enqueueBulkSMS } = require('../lib/smsQueue')
const { Question, QuestionResponse, DailyQuestionStat, User, sequelize } = require('../models')


const assignQuestionToUser = async (user) => {

    const today = new Date().toISOString().split('T')[0];

    return await sequelize.transaction(async (t) => {

        // 1️⃣ Vérifier si user a déjà reçu une question aujourd'hui
        const alreadyReceived = await QuestionResponse.findOne({
            where: {
                phone_number: user.phone_number,
                created_date: {
                    [Op.gte]: new Date(today)
                }
            },
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        if (alreadyReceived) {
            return null; // Rien à faire
        }

        // 2️⃣ Vérifier si user a vu toutes les questions
        const totalQuestions = await Question.count({ transaction: t, where: {is_active: true} });

        const seenCount = await QuestionResponse.count({
            where: { phone_number: user.phone_number },
            distinct: true,
            col: 'question_id',
            transaction: t
        });

        const hasSeenAll = seenCount >= totalQuestions;

        let exclusionFilter = {
            is_active: true
        };

        if (!hasSeenAll) {
            const seen = await QuestionResponse.findAll({
                where: { phone_number: user.phone_number },
                attributes: ['question_id'],
                raw: true,
                transaction: t
            });

            const seenIds = seen.map(q => q.question_id);

            exclusionFilter.id = {
                    [Op.notIn]: seenIds.length ? seenIds : [0]
                };
        }

        // 3️⃣ Sélection globale journalière optimisée
        // Sélection de la question sans FOR UPDATE sur l'outer join
        const question = await Question.findOne({
            where: exclusionFilter,
            transaction: t,
            lock: t.LOCK.UPDATE, // lock uniquement sur Question
            order: [
                [literal(`COALESCE((SELECT send_count FROM daily_question_stats WHERE question_id = "Question".id AND date = '${today}'), 0)`), 'ASC'],
                ['id', 'ASC']
            ],
        });

        if (!question) return null;

        // 4️⃣ Enregistrer attribution
        await QuestionResponse.create({
            question_id: question.id,
            phone_number: user.phone_number,
            already_read: false,
            created_date: new Date()
        }, { transaction: t });

        // 5️⃣ Incrément atomique daily stats
        await sequelize.query(`
      INSERT INTO daily_question_stats (question_id, date, send_count)
      VALUES (:questionId, :today, 1)
      ON CONFLICT (question_id, date)
      DO UPDATE SET send_count = daily_question_stats.send_count + 1
    `, {
            replacements: { questionId: question.id, today },
            transaction: t
        });

        return question;
    });
};

const pushQuestionToUser = async (user, introMgs = []) => {
    try {
        const question = await assignQuestionToUser(user);

        if (question) {
            await enqueueBulkSMS(
                user.phone_number,
                [
                    ...introMgs,
                    `Soyez-prêt à gagner des prix incroyable en répondant à la question du jour.`
                ]
            )
        }

    } catch (err) {
        console.error("Erreur user:", user.phone_number, err);
    }
}

const processDailyQuestions = async () => {

    console.log("processDailyQuestions Started")
    const batchSize = 500;
    let offset = 0;
    let users;

    do {

        users = await User.findAll({
            where: { is_subscribed: true },
            limit: batchSize,
            offset
        });

        for (const user of users) {
            pushQuestionToUser(user)
        }

        offset += batchSize;

    } while (users.length === batchSize);

    console.log("processDailyQuestions Ended")

};

module.exports = { processDailyQuestions, pushQuestionToUser };