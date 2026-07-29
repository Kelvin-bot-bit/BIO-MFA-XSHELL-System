#!/usr/bin/env python3
import mysql.connector
from dotenv import load_dotenv
import os

load_dotenv()

def test_database_connection():
    print("🔍 Testing XShell Database Connection...")
    
    try:
        # Get connection details from environment
        db_config = {
            'host': os.getenv('MYSQL_HOST', 'localhost'),
            'user': os.getenv('MYSQL_USER', 'root'),
            'password': os.getenv('MYSQL_PASSWORD', ''),
            'database': os.getenv('MYSQL_DB', 'XShell_db'),
            'port': os.getenv('MYSQL_PORT', '3306')
        }
        
        print(f"📊 Connection Details:")
        print(f"   Host: {db_config['host']}")
        print(f"   Database: {db_config['database']}")
        print(f"   User: {db_config['user']}")
        print(f"   Port: {db_config['port']}")
        
        # Test connection
        connection = mysql.connector.connect(**db_config)
        
        if connection.is_connected():
            print("✅ Database connection successful!")
            
            # Get database info
            cursor = connection.cursor()
            
            # Show tables
            cursor.execute("SHOW TABLES")
            tables = [table[0] for table in cursor.fetchall()]
            print(f"📋 Tables in XShell_db: {len(tables)} tables")
            for table in tables:
                print(f"   - {table}")
            
            # Show table structures
            print(f"\n📊 Table Structures:")
            for table in tables:
                cursor.execute(f"DESCRIBE {table}")
                columns = cursor.fetchall()
                print(f"   {table} ({len(columns)} columns):")
                for col in columns:
                    print(f"     - {col[0]} ({col[1]})")
            
            # Count records in each table
            print(f"\n📈 Record Counts:")
            for table in tables:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                print(f"   {table}: {count} records")
            
            cursor.close()
            connection.close()
            
            print("\n🎉 All database tests passed!")
            return True
            
    except mysql.connector.Error as e:
        print(f"❌ Database connection failed: {e}")
        print("\n🔧 Troubleshooting Steps:")
        print("   1. Check if XAMPP is running: sudo /opt/lampp/lampp status")
        print("   2. Start MySQL: sudo /opt/lampp/lampp startmysql")
        print("   3. Verify database exists: mysql -u root -e 'SHOW DATABASES;'")
        print("   4. Check .env file configuration")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    test_database_connection()