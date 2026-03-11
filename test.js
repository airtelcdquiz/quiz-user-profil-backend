/**
 * This is randum function called to send question to user
 */
const RandumFunction = async (user, checkCampaignActive) => {
  try {

    // Retreive all special question in database for activ campagne
    // const checkCampaignActive = await FindCampaignStatus("1");
    // const query_1 = `SELECT id FROM campaignsQuestions where campaign_question_type = 'special-question' and campaign_code = '425'`;
    const query_1 = `SELECT question_id FROM public."specialQuestionTrackers" WHERE phone_number = ${user.id}`
    const query_2 = `SELECT id FROM public."campaignsQuestions" where campaign_question_type = 'special-question' and campaign_code = '425' and id NOT IN (${query_1}) and is_active=true and archived = false`;
    const query_6 = `
      SELECT 
          cq.id AS question_id,
          COALESCE(COUNT(st.question_id), 0) AS occurrence_count
      FROM 
          public."campaignsQuestions" cq
      LEFT JOIN 
          public."specialQuestionTrackers" st
      ON 
          cq.id = st.question_id
      WHERE 
        cq.campaign_question_type = 'special-question' and cq.campaign_code = '425' and
        cq.id IN (${query_2})
        and is_active=true and archived = false
      GROUP BY 
          cq.id
      ORDER BY 
          occurrence_count ASC,
          question_id ASC;
    `;
 
    const query_7 = `
      SELECT 
          cq.id AS question_id,
          COALESCE(COUNT(st.question_id), 0) AS occurrence_count,

          MAX(st.created_at) AS last_date
      FROM 
          public."campaignsQuestions" cq
      LEFT JOIN 
          public."specialQuestionTrackers" st
      ON 
          cq.id = st.question_id
      WHERE 
        cq.campaign_question_type = 'special-question' and cq.campaign_code = '425' and
        st.phone_number = ${user.id} 
         and is_active=true and archived = false
      GROUP BY 
          cq.id
      ORDER BY 
          occurrence_count ASC, 
          last_date ASC;`;
    // const query_3 =  
    // 1. Get count of specialQuestionTrackers for the current user
    // const specialQuestionTrackers = (await db.sequelize.query(`SELECT question_id FROM specialQuestionTrackers WHERE phone_number = ${user.id};`, { type: Sequelize.QueryTypes.SELECT }))

    var availableQuestionsToUse = [];
    // 2. Check if user already receive all question existing in datase
    availableQuestionsToUse = (await db.sequelize.query(query_2, { type: Sequelize.QueryTypes.SELECT })).map(e => e.id)

    // Case we have some question not already used for the user
    if (availableQuestionsToUse.length > 0) {
      console.log("J'ai des questions disponible à envoyer ", availableQuestionsToUse.length)
      // Not used questions find in database
      availableQuestionsToUse = (await db.sequelize.query(query_6, { type: Sequelize.QueryTypes.SELECT })).map(e => e.question_id);
      // if(_availableQuestionsToUse.length == 0){

      // }
      console.log("Resultat de la requete 5 : ", availableQuestionsToUse.length)
    } else {
      console.log("J'ai déja consommé toutes les questions")
      availableQuestionsToUse = (await db.sequelize.query(query_7, { type: Sequelize.QueryTypes.SELECT })).map(e => e.question_id);
      // We need to re-use question
      // availableQuestionsToUse = (await db.sequelize.query(query_4, { type: Sequelize.QueryTypes.SELECT })).map(e => e.question_id);
    }

    return availableQuestionsToUse;
  } catch (e) {
    logger.error(e)
    console.error(e)
    console.log(e)
    return []
  }
}