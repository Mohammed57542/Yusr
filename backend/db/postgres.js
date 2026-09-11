import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Convert SQLite-style `?` placeholders to PostgreSQL `$1, $2, ...`
function convertPlaceholders(sql, params) {
  if (!params || params.length === 0) return { sql, params: [] };
  let idx = 0;
  const converted = sql.replace(/\?/g, () => `$${++idx}`);
  return { sql: converted, params };
}

// ─── PostgreSQL adapter — same API as the SQLite adapter ───
const adapter = {
  pool,

  async exec(sql) {
    const client = await pool.connect();
    try {
      // exec can contain multiple statements separated by `;`
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);
      for (const stmt of statements) {
        await client.query(stmt);
      }
    } finally {
      client.release();
    }
  },

  async prepare(sql) {
    // In pg, prepared statements are done via the query API.
    // We return a wrapper that supports .run(), .get(), .all()
    return {
      async run(...params) {
        const { sql: q, params: p } = convertPlaceholders(sql, params);
        const result = await pool.query(q, p);
        return { changes: result.rowCount };
      },
      async get(...params) {
        const { sql: q, params: p } = convertPlaceholders(sql, params);
        const result = await pool.query(q, p);
        return result.rows[0] || undefined;
      },
      async all(...params) {
        const { sql: q, params: p } = convertPlaceholders(sql, params);
        const result = await pool.query(q, p);
        return result.rows;
      },
    };
  },

  async run(sql, ...params) {
    if (params.length === 0) {
      await pool.query(sql);
      return { changes: 0 };
    }
    const { sql: q, params: p } = convertPlaceholders(sql, params);
    const result = await pool.query(q, p);
    return { changes: result.rowCount };
  },

  async get(sql, ...params) {
    const { sql: q, params: p } = convertPlaceholders(sql, params);
    const result = await pool.query(q, p);
    return result.rows[0] || undefined;
  },

  async all(sql, ...params) {
    const { sql: q, params: p } = convertPlaceholders(sql, params);
    const result = await pool.query(q, p);
    return result.rows;
  },

  async transaction(fn) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Provide a transaction-scoped query helper
      const txQuery = async (sql, ...params) => {
        const { sql: q, params: p } = convertPlaceholders(sql, params);
        return client.query(q, p);
      };
      const result = await fn({ query: txQuery });
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // PostgreSQL equivalent of PRAGMA table_info
  async tableInfo(tableName) {
    const result = await pool.query(
      `SELECT column_name AS name, data_type AS type, is_nullable
       FROM information_schema.columns
       WHERE table_name = $1
       ORDER BY ordinal_position`,
      [tableName]
    );
    return result.rows;
  },

  async close() {
    await pool.end();
  },
};

export default adapter;
