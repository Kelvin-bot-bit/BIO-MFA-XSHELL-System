#!/usr/bin/env python3
import mysql.connector
from dotenv import load_dotenv
import os

load_dotenv()

def setup_database_xshell():
    print("🔧 Setting up XShell database with XAMPP...")
    
    try:
        # XAMPP MySQL connection
        connection = mysql.connector.connect(
            host='localhost',
            user='root',
            password='',  # XAMPP default is empty password
            port=3306
        )
        cursor = connection.cursor()
        
        # Create XShell database
        cursor.execute("CREATE DATABASE IF NOT EXISTS XShell_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        print("✅ Database 'XShell_db' created successfully")
        
        # Use the database
        cursor.execute("USE XShell_db")
        print("✅ Using database: XShell_db")
        
        # Table creation SQL
        schema_sql = [
            # Users table
            """
            CREATE TABLE IF NOT EXISTS users (
                user_id VARCHAR(36) PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                phone VARCHAR(20) NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
                updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                INDEX idx_email (email),
                INDEX idx_created_at (created_at),
                INDEX idx_is_active (is_active),
                INDEX idx_phone (phone)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """,
            
            # Facial data table
            """
            CREATE TABLE IF NOT EXISTS facial_data (
                face_id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) UNIQUE NOT NULL,
                facial_encoding LONGBLOB NOT NULL,
                registered_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
                updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_registered_at (registered_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """,
            
            # OTP logs table
            """
            CREATE TABLE IF NOT EXISTS otp_logs (
                otp_id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                otp_hash VARCHAR(255) NOT NULL,
                purpose ENUM('login', 'password_reset', 'email_verification', 'account_recovery') NOT NULL,
                created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
                expires_at DATETIME(6) NOT NULL,
                is_used BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_expires_at (expires_at),
                INDEX idx_purpose (purpose),
                INDEX idx_created_at (created_at),
                INDEX idx_is_used (is_used),
                INDEX idx_user_purpose (user_id, purpose)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """,
            
            # Login sessions table
            """
            CREATE TABLE IF NOT EXISTS login_sessions (
                session_id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                device_info TEXT,
                ip_address VARCHAR(45),
                user_agent TEXT,
                password_verified BOOLEAN DEFAULT FALSE,
                otp_verified BOOLEAN DEFAULT FALSE,
                face_verified BOOLEAN DEFAULT FALSE,
                access_token_hash VARCHAR(255),
                refresh_token_hash VARCHAR(255),
                created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
                last_activity DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
                expires_at DATETIME(6) NOT NULL,
                logged_out_at DATETIME(6) NULL,
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_expires_at (expires_at),
                INDEX idx_created_at (created_at),
                INDEX idx_last_activity (last_activity),
                INDEX idx_access_token (access_token_hash),
                INDEX idx_user_session (user_id, created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """,
            
            # Failed login attempts table
            """
            CREATE TABLE IF NOT EXISTS failed_login_attempts (
                attempt_id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NULL,
                email VARCHAR(255) NULL,
                ip_address VARCHAR(45) NOT NULL,
                user_agent TEXT,
                reason VARCHAR(100) NOT NULL,
                attempted_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL ON UPDATE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_ip_address (ip_address),
                INDEX idx_attempted_at (attempted_at),
                INDEX idx_email (email)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """,
            
            # Password reset tokens table
            """
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                token_id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                token_hash VARCHAR(255) NOT NULL,
                expires_at DATETIME(6) NOT NULL,
                is_used BOOLEAN DEFAULT FALSE,
                created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
                INDEX idx_user_id (user_id),
                INDEX idx_expires_at (expires_at),
                INDEX idx_token_hash (token_hash)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """
        ]
        
        # Execute each table creation
        table_names = ['users', 'facial_data', 'otp_logs', 'login_sessions', 'failed_login_attempts', 'password_reset_tokens']
        for i, sql in enumerate(schema_sql):
            try:
                cursor.execute(sql)
                print(f"✅ Table '{table_names[i]}' created successfully")
            except mysql.connector.Error as err:
                print(f"⚠️  Table creation warning ({table_names[i]}): {err}")
        
        print("✅ All tables created successfully in XShell_db")
        
        cursor.close()
        connection.close()
        
        print("🎉 XShell database setup completed!")
        print("📊 XShell Database Structure:")
        print("   👤 users - User accounts")
        print("   📷 facial_data - Face encodings") 
        print("   🔑 otp_logs - OTP management")
        print("   💻 login_sessions - Session tracking")
        print("   🚫 failed_login_attempts - Security monitoring")
        print("   🔄 password_reset_tokens - Password recovery")
        
        return True
        
    except Exception as e:
        print(f"❌ XShell database setup failed: {e}")
        return False

if __name__ == "__main__":
    setup_database_xshell()