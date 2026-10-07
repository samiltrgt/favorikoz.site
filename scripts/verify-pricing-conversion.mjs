// Runs only against an isolated, in-memory PostgreSQL instance. No live credentials.
import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

const db = new PGlite()
const forward = await readFile(new URL('./normalize-product-prices.sql', import.meta.url), 'utf8')
const rollback = await readFile(new URL('./rollback-product-prices.sql', import.meta.url), 'utf8')
try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE TABLE products (id text PRIMARY KEY, price bigint, original_price bigint);
    CREATE TABLE orders (id text PRIMARY KEY, total bigint);
    INSERT INTO products VALUES ('175',175000,200000), ('6500',6500000,NULL), ('319.90',319900,350000);
    INSERT INTO orders VALUES ('old-order',31990);`)
  await db.exec(forward)
  assert.deepEqual((await db.query('SELECT price FROM products ORDER BY id')).rows.map(r => r.price), [17500,31990,650000])
  assert.equal((await db.query('SELECT total FROM orders')).rows[0].total,31990)
  await assert.rejects(db.exec(forward), /already exists/)
  await db.exec('ROLLBACK')
  await db.exec("UPDATE products SET price=18000 WHERE id='175'")
  await assert.rejects(db.exec(rollback), /automatic rollback refused/)
  await db.exec('ROLLBACK')
  await db.exec("UPDATE products SET price=17500 WHERE id='175'")
  await db.exec(rollback)
  assert.deepEqual((await db.query('SELECT price FROM products ORDER BY id')).rows.map(r => r.price), [175000,319900,6500000])
  assert.equal((await db.query('SELECT total FROM orders')).rows[0].total,31990)
  console.log('Pricing conversion: amounts, repeat protection, rollback guard, restoration and existing orders verified.')
} finally {
  await db.close()
}
