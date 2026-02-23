CREATE TABLE daily_job_logs (
  job_name VARCHAR(50),
  date DATE,
  PRIMARY KEY (job_name, date)
);