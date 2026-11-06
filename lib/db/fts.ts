import type Database from 'better-sqlite3'

/** Create the external-content full-text index and keep it in sync with skills. */
export function createFts(database: Database.Database): void {
  database.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS skills_fts USING fts5(
      name, description, body, business_scene,
      content='skills', content_rowid='rowid'
    );

    CREATE TRIGGER IF NOT EXISTS skills_fts_insert AFTER INSERT ON skills BEGIN
      INSERT INTO skills_fts(rowid, name, description, body, business_scene)
      VALUES (new.rowid, new.name, new.description, new.body, new.business_scene);
    END;

    CREATE TRIGGER IF NOT EXISTS skills_fts_delete AFTER DELETE ON skills BEGIN
      INSERT INTO skills_fts(skills_fts, rowid, name, description, body, business_scene)
      VALUES ('delete', old.rowid, old.name, old.description, old.body, old.business_scene);
    END;

    CREATE TRIGGER IF NOT EXISTS skills_fts_update AFTER UPDATE ON skills BEGIN
      INSERT INTO skills_fts(skills_fts, rowid, name, description, body, business_scene)
      VALUES ('delete', old.rowid, old.name, old.description, old.body, old.business_scene);
      INSERT INTO skills_fts(rowid, name, description, body, business_scene)
      VALUES (new.rowid, new.name, new.description, new.body, new.business_scene);
    END;
  `)
  database.exec(`INSERT INTO skills_fts(skills_fts) VALUES ('rebuild')`)
}
