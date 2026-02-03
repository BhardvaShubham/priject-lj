"""
Database migration script to add authentication and company support
Run this once to update existing database
"""
import sqlite3
from werkzeug.security import generate_password_hash

DB = "imcs.db"

def migrate():
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    
    try:
        # Create companies table
        c.execute("""
            CREATE TABLE IF NOT EXISTS companies (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Add login_id to users table (without UNIQUE constraint - SQLite limitation)
        try:
            c.execute("ALTER TABLE users ADD COLUMN login_id TEXT")
        except sqlite3.OperationalError:
            pass  # Column might already exist
        
        # Note: We enforce uniqueness of (login_id, company_id) in application code
        # SQLite doesn't support adding UNIQUE constraint in ALTER TABLE ADD COLUMN
        
        try:
            c.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")
        except sqlite3.OperationalError:
            pass
        
        try:
            c.execute("ALTER TABLE users ADD COLUMN company_id INTEGER REFERENCES companies(id)")
        except sqlite3.OperationalError:
            pass
        
        # Add company_id to machines table
        try:
            c.execute("ALTER TABLE machines ADD COLUMN company_id INTEGER REFERENCES companies(id)")
        except sqlite3.OperationalError:
            pass
        
        # Add company_id to sensors (via machine_id relationship, but we'll add it for direct access)
        # Sensors inherit company_id from machines, but we can add it for performance
        
        # Add company_id to alarms
        try:
            c.execute("ALTER TABLE alarms ADD COLUMN company_id INTEGER REFERENCES companies(id)")
        except sqlite3.OperationalError:
            pass
        
        # Add company_id to maintenance_tasks
        try:
            c.execute("ALTER TABLE maintenance_tasks ADD COLUMN company_id INTEGER REFERENCES companies(id)")
        except sqlite3.OperationalError:
            pass
        
        # Create default company if none exists
        c.execute("SELECT COUNT(*) FROM companies")
        if c.fetchone()[0] == 0:
            c.execute("INSERT INTO companies (name) VALUES ('Default Company')")
            default_company_id = c.lastrowid
            
            # Update existing machines to default company
            c.execute("UPDATE machines SET company_id = ? WHERE company_id IS NULL", (default_company_id,))
            
            # Update existing alarms
            c.execute("""
                UPDATE alarms SET company_id = (
                    SELECT company_id FROM machines WHERE machines.id = alarms.machine_id
                ) WHERE company_id IS NULL
            """)
            
            # Update existing maintenance_tasks
            c.execute("""
                UPDATE maintenance_tasks SET company_id = (
                    SELECT company_id FROM machines WHERE machines.id = maintenance_tasks.machine_id
                ) WHERE company_id IS NULL
            """)
        
        conn.commit()
        print("Migration completed successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"Migration error: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
