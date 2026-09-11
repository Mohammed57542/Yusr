import pg from 'pg';
const { Pool } = pg;

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

function toPg(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function convertSql(sql) {
  return sql
    .replace(/datetime\('now'\)/gi, 'NOW()')
    .replace(/datetime\('now',\s*'-1 day'\)/gi, "NOW() - INTERVAL '1 day'")
    .replace(/datetime\('now',\s*'\+(\d+) days?'\)/gi, "NOW() + INTERVAL '$1 days'")
    .replace(/AUTOINCREMENT/gi, '')
    .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY')
    .replace(/OR IGNORE/gi, 'ON CONFLICT DO NOTHING');
}

function runQuery(sql, params = []) {
  const pgSql = convertSql(toPg(sql));
  return getPool().query(pgSql, params);
}

const adapter = {
  prepare(sql) {
    return {
      get(...params) {
        return runQuery(sql, params).then((r) => r.rows[0] || undefined);
      },
      all(...params) {
        return runQuery(sql, params).then((r) => r.rows);
      },
      run(...params) {
        return runQuery(sql, params).then((r) => ({
          changes: r.rowCount,
          lastInsertRowid: r.rows[0]?.id || null,
        }));
      },
    };
  },

  exec(sql) {
    return runQuery(sql);
  },

  get(sql, ...params) {
    return runQuery(sql, params).then((r) => r.rows[0] || undefined);
  },

  all(sql, ...params) {
    return runQuery(sql, params).then((r) => r.rows);
  },

  run(sql, ...params) {
    return runQuery(sql, params).then((r) => ({
      changes: r.rowCount,
      lastInsertRowid: r.rows[0]?.id || null,
    }));
  },

  async tableInfo(tableName) {
    const result = await getPool().query(
      `SELECT column_name as name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_name = $1
       ORDER BY ordinal_position`,
      [tableName]
    );
    return result.rows;
  },

  async close() {
    if (pool) {
      await pool.end();
      pool = null;
    }
  },
};

// Transaction helper — gets a client from pool, runs fn, commits/rollbacks
adapter.transaction = async (fn) => {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    // Provide a transaction-scoped query helper
    const txQuery = (sql, params = []) => {
      const pgSql = convertSql(toPg(sql));
      return client.query(pgSql, params);
    };
    const txAdapter = {
      prepare(sql) {
        return {
          get(...params) { return txQuery(sql, params).then(r => r.rows[0]); },
          all(...params) { return txQuery(sql, params).then(r => r.rows); },
          run(...params) { return txQuery(sql, params).then(r => ({ changes: r.rowCount, lastInsertRowid: r.rows[0]?.id })); },
        };
      },
      exec(sql) { return txQuery(sql); },
      get(sql, ...params) { return txQuery(sql, params).then(r => r.rows[0]); },
      all(sql, ...params) { return txQuery(sql, params).then(r => r.rows); },
      run(sql, ...params) { return txQuery(sql, params).then(r => ({ changes: r.rowCount, lastInsertRowid: r.rows[0]?.id })); },
    };
    const result = await fn(txAdapter);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export default adapter;
