CREATE TABLE IF NOT EXISTS user (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  INDEX idx_username (username),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS image (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  original_path VARCHAR(500) NOT NULL,
  thumbnail_small VARCHAR(500),
  thumbnail_medium VARCHAR(500),
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(50) NOT NULL,
  width INT,
  height INT,
  is_edited BOOLEAN DEFAULT FALSE,
  parent_image_id BIGINT,
  upload_time DATETIME NOT NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_upload_time (upload_time),
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_image_id) REFERENCES image(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS image_metadata (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  image_id BIGINT NOT NULL UNIQUE,
  capture_time DATETIME,
  gps_latitude DECIMAL(10, 8),
  gps_longitude DECIMAL(11, 8),
  location_name VARCHAR(255),
  province VARCHAR(50),
  city VARCHAR(50),
  width INT,
  height INT,
  camera_model VARCHAR(100),
  aperture VARCHAR(20),
  shutter_speed VARCHAR(20),
  iso INT,
  INDEX idx_capture_time (capture_time),
  INDEX idx_location_name (location_name),
  FOREIGN KEY (image_id) REFERENCES image(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS tag (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL UNIQUE,
  tag_type ENUM('custom', 'ai') NOT NULL,
  created_at DATETIME NOT NULL,
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS image_tag (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  image_id BIGINT NOT NULL,
  tag_id BIGINT NOT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uk_image_tag (image_id, tag_id),
  INDEX idx_image_id (image_id),
  INDEX idx_tag_id (tag_id),
  FOREIGN KEY (image_id) REFERENCES image(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tag(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
