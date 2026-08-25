-- Migration 003: Sanitation & Material Traceability
CREATE TABLE IF NOT EXISTS sanitation_checklist_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cleaner_name VARCHAR(255) NOT NULL,
  area_name VARCHAR(255) NOT NULL,
  checklist_data JSON NULL,
  verified_by VARCHAR(255) NULL,
  logged_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS waste_disposal_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  disposal_type VARCHAR(100) NOT NULL,
  waste_weight_kg DECIMAL(10,2) NOT NULL,
  disposal_company VARCHAR(255) NOT NULL,
  manifest_number VARCHAR(100) NOT NULL,
  disposed_by VARCHAR(255) NOT NULL,
  disposed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS staff_health_certificates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  staff_name VARCHAR(255) NOT NULL,
  certificate_type VARCHAR(100) NOT NULL,
  issued_date DATE NOT NULL,
  expiration_date DATE NOT NULL,
  document_url VARCHAR(500) NULL,
  status VARCHAR(50) DEFAULT 'valid',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS studio_sanitary_permits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  permit_type VARCHAR(100) NOT NULL,
  permit_number VARCHAR(100) NOT NULL,
  issuing_authority VARCHAR(255) NOT NULL,
  issued_date DATE NOT NULL,
  expiration_date DATE NOT NULL,
  renewal_status VARCHAR(50) DEFAULT 'active',
  document_url VARCHAR(500) NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
