-- Fix PostgreSQL collation version mismatch
-- Run this in your database to resolve the warning

-- Refresh the collation version for database p1
ALTER DATABASE p1 REFRESH COLLATION VERSION;

-- Optionally reindex all indexes to use the new collation
REINDEX DATABASE p1;

