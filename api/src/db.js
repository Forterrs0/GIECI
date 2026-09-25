import mysql from "mysql2/promise";

export function createPool(config) {
  return mysql.createPool(config.db);
}

export async function transaction(pool, work, { readOnly = false } = {}) {
  const connection = await pool.getConnection();
  try {
    await connection.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
    if (readOnly) await connection.query("SET TRANSACTION READ ONLY");
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
