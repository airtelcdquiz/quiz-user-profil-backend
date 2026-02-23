const { Op, fn, col, literal } = require('sequelize');

const getSmartQuestionForUser = async (user) => {
  try {

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1️⃣ Stats utilisateur
    const totalQuestions = await Question.count();

    const userSeenCount = await QuestionResponse.count({
      where: { user_id: user.phone_number },
      distinct: true,
      col: 'question_id'
    });

    const hasSeenAll = userSeenCount >= totalQuestions;

    // 2️⃣ Sous-requête des questions déjà vues (si nécessaire)
    let exclusionFilter = {};

    if (!hasSeenAll) {
      const seenQuestions = await QuestionResponse.findAll({
        where: { user_id: user.phone_number },
        attributes: ['question_id'],
        raw: true
      });

      const seenIds = seenQuestions.map(q => q.question_id);

      exclusionFilter = {
        id: {
          [Op.notIn]: seenIds.length ? seenIds : [0]
        }
      };
    }

    // 3️⃣ Requête principale
    const questions = await Question.findAll({
      where: exclusionFilter,
      attributes: [
        'id',

        // Nombre total d'envois global
        [fn('COUNT', col('question_responses.id')), 'total_count'],

        // Nombre d'envois aujourd’hui
        [
          fn(
            'SUM',
            literal(`CASE 
              WHEN question_responses.created_date >= '${todayStart.toISOString()}' 
              THEN 1 ELSE 0 END`)
          ),
          'today_count'
        ],

        // Nombre d'envois pour cet utilisateur
        [
          fn(
            'SUM',
            literal(`CASE 
              WHEN question_responses.user_id = '${user.phone_number}' 
              THEN 1 ELSE 0 END`)
          ),
          'user_count'
        ]
      ],
      include: [{
        model: QuestionResponse,
        attributes: [],
        required: false
      }],
      group: ['Question.id'],
      order: [
        [literal('today_count'), 'ASC'],   // 🌍 priorité globale jour
        [literal('user_count'), 'ASC'],    // 👤 priorité utilisateur
        [literal('total_count'), 'ASC'],   // 📊 équilibrage historique
        ['id', 'ASC']
      ],
      raw: true
    });

    return questions[0] || null;

  } catch (error) {
    console.error("Smart question error:", error);
    return null;
  }
};