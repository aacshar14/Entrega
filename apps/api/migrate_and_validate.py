import os
import sys
import logging
from alembic.config import Config
from alembic import command, script
from alembic.runtime import migration
from sqlalchemy import create_engine

# Configure world-class logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger("migration_runner")

def get_current_revision(engine):
    with engine.connect() as conn:
        context = migration.MigrationContext.configure(conn)
        return context.get_current_revision()

def get_head_revision(alembic_cfg):
    directory = script.ScriptDirectory.from_config(alembic_cfg)
    return directory.get_current_head()

def run():
    # 1. Setup
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        logger.error("DATABASE_URL environment variable is missing!")
        sys.exit(1)
        
    logger.info("MIGRATION_START")
    
    try:
        # Load Alembic Config
        alembic_cfg = Config("alembic.ini")
        engine = create_engine(database_url)
        
        # 2. Capture State Before
        rev_before = get_current_revision(engine)
        rev_head = get_head_revision(alembic_cfg)
        
        logger.info(f"MIGRATION_REVISION_BEFORE: {rev_before or 'None (Empty DB)'}")
        logger.info(f"MIGRATION_REVISION_TARGET (HEAD): {rev_head}")
        
        if rev_before == rev_head:
            logger.info("ALREADY_CURRENT: Revision matches Head. No migration needed.")
            logger.info("MIGRATION_SUCCESS")
            return

        # 3. Execute Migration
        logger.info(f"UPGRADING_TO: {rev_head}...")
        command.upgrade(alembic_cfg, "head")
        
        # 4. Validate Final State
        rev_after = get_current_revision(engine)
        logger.info(f"MIGRATION_REVISION_AFTER: {rev_after}")
        
        if rev_after != rev_head:
            logger.error(f"REVISION_MISMATCH: Expected {rev_head} but got {rev_after}")
            logger.error("DEPLOY_BLOCKED_DUE_TO_MIGRATION")
            sys.exit(1)
            
        logger.info("MIGRATION_SUCCESS: Database is now at the expected head revision.")
        
    except Exception as e:
        logger.error(f"MIGRATION_FAILURE: {str(e)}")
        logger.error("DEPLOY_BLOCKED_DUE_TO_MIGRATION")
        sys.exit(1)

if __name__ == "__main__":
    run()
