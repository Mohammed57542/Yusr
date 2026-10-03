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

function fixRoundArgs(sql) {
  const upper = sql.toUpperCase();
  let out = '';
  let i = 0;
  for (;;) {
    const idx = upper.indexOf('ROUND(', i);
    if (idx === -1) {
      out += sql.slice(i);
      return out;
    }
    out += sql.slice(i, idx) + 'ROUND(';
    const argStart = idx + 6;
    let depth = 1;
    let j = argStart;
    let commaTop = -1;
    while (j < sql.length) {
      const ch = sql[j];
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0) break;
      } else if (ch === ',' && depth === 1 && commaTop === -1) commaTop = j;
      j++;
    }
    if (commaTop === -1) {
      out += sql.slice(argStart, j);
    } else {
      out += sql.slice(argStart, commaTop) + '::numeric' + sql.slice(commaTop, j);
    }
    out += ')';
    i = j + 1;
  }
}

function convertSql(sql) {
  return fixRoundArgs(sql)
    .replace(/strftime\(\s*'%Y-%m'\s*,\s*([^)]+?)\s*\)/gi, 'substr($1, 1, 7)')
    .replace(/datetime\(\s*'now'\s*,\s*'-(\d+)\s+days?'\s*\)/gi, "(NOW() - INTERVAL '$1 days')::text")
    .replace(/datetime\(\s*'now'\s*,\s*'\+(\d+)\s+days?'\s*\)/gi, "(NOW() + INTERVAL '$1 days')::text")
    .replace(/datetime\(\s*'now'\s*\)/gi, 'NOW()::text')
    .replace(/date\(\s*'now'\s*\)/gi, 'CURRENT_DATE::text')
    .replace(/GROUP_CONCAT\(\s*DISTINCT\s+([^()]*?)\s*\)/gi, "STRING_AGG(DISTINCT $1, ',')")
    .replace(/GROUP_CONCAT\(\s*([^(),]*?)\s*\)/gi, "STRING_AGG($1, ',')")
    .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY')
    .replace(/AUTOINCREMENT/gi, '')
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
