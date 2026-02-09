import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = {
  pool,
  async init() {
    // No-op: schema + seed are handled by Postgres init scripts in Docker.
    // For local dev, ensure db/ scripts are applied.
    await this.ping();
  },
  async ping() {
    try {
      const r = await pool.query('SELECT 1 as ok');
      return r.rows?.[0]?.ok === 1;
    } catch {
      return false;
    }
  }
};
