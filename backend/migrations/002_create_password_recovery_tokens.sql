CREATE TABLE IF NOT EXISTS password_recovery_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  failed_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  max_attempts TINYINT UNSIGNED NOT NULL DEFAULT 5,
  used_at DATETIME NULL,
  revoked_at DATETIME NULL,
  requested_by_ip_hash CHAR(64) NOT NULL,
  user_agent VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_password_recovery_user (user_id),
  INDEX idx_password_recovery_expiry (expires_at),
  CONSTRAINT fk_password_recovery_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
