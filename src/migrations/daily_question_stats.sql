CREATE TABLE daily_question_stats (
  question_id INT NOT NULL,
  date DATE NOT NULL,
  send_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (question_id, date)
);