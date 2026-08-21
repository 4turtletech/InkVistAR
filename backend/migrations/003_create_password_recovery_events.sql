CREATE TABLE IF NOT EXISTS password_recovery_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email_hash CHAR(64) NOT NULL,
  ip_hash CHAR(64) NOT NULL,
  event_type VARCHAR(16) NOT NULL,
  success TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_password_recovery_event_email (email_hash, event_type, created_at),
  INDEX idx_password_recovery_event_ip (ip_hash, event_type, created_at)
);
