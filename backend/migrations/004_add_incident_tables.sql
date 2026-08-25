-- Migration 004: Incident Reports & Messaging
CREATE TABLE IF NOT EXISTS incident_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  incident_code VARCHAR(50) NOT NULL UNIQUE,
  customer_id INT NOT NULL,
  appointment_id INT NULL,
  reported_by VARCHAR(100) NOT NULL,
  incident_type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) DEFAULT 'medium',
  description TEXT NOT NULL,
  photos JSON NULL,
  staff_response TEXT NULL,
  medical_referral_required TINYINT(1) DEFAULT 0,
  emergency_escalation TINYINT(1) DEFAULT 0,
  resolution_notes TEXT NULL,
  status VARCHAR(50) DEFAULT 'open',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS incident_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  incident_id INT NOT NULL,
  sender_id INT NOT NULL,
  sender_role VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  attachments JSON NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (incident_id) REFERENCES incident_reports(id) ON DELETE CASCADE
);
