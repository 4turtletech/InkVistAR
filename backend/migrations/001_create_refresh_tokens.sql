CREATE TABLE IF NOT EXISTS refresh_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  family_id CHAR(36) NOT NULL,
  client_type VARCHAR(16) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME NULL,
  revoked_at DATETIME NULL,
  replaced_by_token_id BIGINT UNSIGNED NULL,
  created_by_ip VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  INDEX idx_refresh_tokens_user_id (user_id),
  INDEX idx_refresh_tokens_family_id (family_id),
  INDEX idx_refresh_tokens_expires_at (expires_at),
  CONSTRAINT fk_refresh_tokens_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
