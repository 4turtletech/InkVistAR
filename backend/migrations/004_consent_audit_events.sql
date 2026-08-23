UPDATE consent_records
SET waiver_hash = LOWER(SHA2(waiver_text, 256))
WHERE (waiver_hash IS NULL OR waiver_hash NOT REGEXP '^[a-f0-9]{64}$')
  AND CHAR_LENGTH(TRIM(waiver_text)) >= 20
  AND CHAR_LENGTH(TRIM(signature_evidence)) >= 3
  AND UPPER(TRIM(signature_evidence)) <> 'N/A'
-- migrate:split
CREATE TABLE IF NOT EXISTS consent_withdrawal_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  consent_id INT NOT NULL,
  consent_field ENUM('photo_consent', 'marketing_consent') NOT NULL,
  effective_value TINYINT(1) NOT NULL,
  reason VARCHAR(500) NULL,
  changed_by_user_id INT NOT NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45) NULL,
  INDEX idx_consent_withdrawal_consent (consent_id, changed_at)
);
