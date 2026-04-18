/**
 * work3-crawler
 * 车机软件爬取 → 写入数据库工具
 *
 * 用法:
 *   npm run start        # 读取 output.json，写入 MySQL（默认 online 模式）
 *   npm run start:local  # 仅预览，不写入
 */

'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// ─── CLI 参数解析 ──────────────────────────────────────────────────────────
// 支持两种格式: --mode local  或  --mode=local
const modeArg = process.argv.find(a => a.startsWith('--mode='));
const modeIdx = process.argv.indexOf('--mode');
if (modeArg) {
  process.env.CRAWLER_MODE = modeArg.split('=')[1];
} else if (modeIdx !== -1 && process.argv[modeIdx + 1] && !process.argv[modeIdx + 1].startsWith('--')) {
  process.env.CRAWLER_MODE = process.argv[modeIdx + 1];
} else {
  process.env.CRAWLER_MODE = 'local';
}

const fs   = require('fs');
const mysql = require('mysql2/promise');

// ─── 配置 ────────────────────────────────────────────────────────
const {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  SOFTWARE_DATA_PATH,
  CRAWLER_MODE = 'online',
} = process.env;

const MODE = CRAWLER_MODE;
const DATA_FILE = SOFTWARE_DATA_PATH || path.join(__dirname, '..', 'output.json');

// ─── 工具函数 ────────────────────────────────────────────────────
function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

function normalizeUrl(url) {
  if (!url) return null;
  if (url.startsWith('//')) return 'https:' + url;
  if (/^https?:\/\//.test(url)) return url;
  return null;
}

function now() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

// ─── 数据库初始化 ─────────────────────────────────────────────────
async function initDatabase(conn) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) AS cnt FROM information_schema.tables
     WHERE table_schema = ? AND table_name = 'software_craw'`,
    [DB_NAME],
  );

  if (rows[0].cnt > 0) {
    // 表已存在，检查结构
    const [cols] = await conn.execute(`DESC software_craw`);
    const colNames = cols.map(c => c.Field);

    // 确保必要字段存在
    const required = ['id','name','type','url','source','description','method','created_at'];
    const missing = required.filter(f => !colNames.includes(f));
    if (missing.length > 0) {
      console.warn('⚠️  表结构缺少字段:', missing.join(', '), '→ 将自动添加');
      for (const f of missing) {
        let colDef;
        if (f === 'id')         colDef = 'id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY';
        else if (f === 'name')  colDef = 'name VARCHAR(255) NOT NULL';
        else if (f === 'type')  colDef = 'type VARCHAR(64) DEFAULT NULL';
        else if (f === 'url')   colDef = 'url VARCHAR(1024) DEFAULT NULL';
        else if (f === 'source') colDef = 'source VARCHAR(64) DEFAULT NULL';
        else if (f === 'description') colDef = 'description TEXT DEFAULT NULL';
        else if (f === 'method') colDef = 'method VARCHAR(64) DEFAULT NULL';
        else if (f === 'created_at') colDef = 'created_at DATETIME DEFAULT CURRENT_TIMESTAMP';
        if (colDef) await conn.execute(`ALTER TABLE software_craw ADD COLUMN ${colDef}`);
      }
      console.log('  表结构已更新');
    }

    // 读取现有数据
    const [existing] = await conn.execute(`SELECT name, type, url FROM software_craw`);
    console.log(`  表已有 ${existing.length} 条记录`);
    return existing;
  } else {
    // 新建表
    await conn.execute(`
      CREATE TABLE software_craw (
        id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        name        VARCHAR(255) NOT NULL,
        type        VARCHAR(64)  DEFAULT NULL COMMENT '版本类型，如车机版/手机版',
        url         VARCHAR(1024) DEFAULT NULL COMMENT 'APK 直链',
        source      VARCHAR(64)  DEFAULT NULL COMMENT '来源：官方/用户提供',
        description TEXT          DEFAULT NULL COMMENT '描述',
        method      VARCHAR(64)  DEFAULT NULL COMMENT '抓取方式',
        created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP,
        updated_at  DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE INDEX idx_name_type (name, type),
        INDEX idx_source (source),
        INDEX idx_type (type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ 数据表 software_craw 创建成功');
    return [];
  }
}

// ─── 主逻辑 ─────────────────────────────────────────────────────
async function main() {
  console.log('\n=== work3-crawler ===');
  console.log(`数据文件: ${DATA_FILE}`);
  console.log(`运行模式: ${MODE}`);
  console.log('');

  // 1. 读取 JSON
  let data;
  try {
    data = readJson(DATA_FILE);
    console.log(`✅ 读取到 ${data.results ? data.results.length : 0} 条记录`);
  } catch(e) {
    console.error('❌ 读取 JSON 失败:', e.message);
    process.exit(1);
  }

  const records = data.results || [];
  if (records.length === 0) {
    console.log('⚠️  无数据，退出');
    process.exit(0);
  }

  // 2. 预览数据
  console.log('\n数据预览（前 3 条）:');
  records.slice(0, 3).forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.name} | ${r.type} | ${r.status} | ${(r.url || '').substring(0, 50)}`);
  });

  // 3. 写入数据库
  if (MODE !== 'online') {
    console.log('\n🔍 local 模式，仅预览不写入');
    console.log('  如需写入数据库，请运行: npm run start');
    process.exit(0);
  }

  console.log('\n📦 正在写入 MySQL...');

  let conn;
  try {
    conn = await mysql.createConnection({
      host:     DB_HOST,
      port:     Number(DB_PORT || 3306),
      user:     DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      charset:  'utf8mb4',
      connectTimeout: 10000,
    });
    console.log('✅ MySQL 连接成功');
  } catch(e) {
    throw new Error('MySQL连接失败: ' + (e.message || e.code));
  }

  // 初始化表
  const existing = await initDatabase(conn);

  // 构建 name→url 映射（用于判断新旧）
  const existingMap = new Map();
  for (const row of existing) {
    existingMap.set(row.name + '|' + row.type, row);
  }

  let inserted = 0, updated = 0, skipped = 0;

  for (const r of records) {
    if (r.status !== 'ok' || !r.url) {
      skipped++;
      continue;
    }

    const key = r.name + '|' + r.type;
    const existingRow = existingMap.get(key);
    const url = normalizeUrl(r.url);

    if (!url) { skipped++; continue; }

    try {
      if (existingRow) {
        // UPDATE（URL 变了才更新）
        if (existingRow.url !== url) {
          await conn.execute(
            `UPDATE software_craw
               SET url = ?, source = ?, description = ?, method = ?, category = ?, updated_at = ?
             WHERE name = ? AND type = ?`,
            [url, r.source || null, r.description || null, r.method || null, r.category || null, now(), r.name, r.type],
          );
          updated++;
        } else {
          // URL 没变，但检查 category / method 等字段是否需要更新
          const needsMeta = existingRow.category !== (r.category || null) || existingRow.method !== (r.method || null);
          if (needsMeta) {
            await conn.execute(
              `UPDATE software_craw SET category = ?, method = ?, updated_at = ? WHERE name = ? AND type = ?`,
              [r.category || null, r.method || null, now(), r.name, r.type],
            );
            updated++;
          } else {
            await conn.execute(
              `UPDATE software_craw SET updated_at = ? WHERE name = ? AND type = ?`,
              [now(), r.name, r.type],
            );
          }
        }
      } else {
        // INSERT
        await conn.execute(
          `INSERT INTO software_craw (name, type, url, source, description, method, category)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [r.name, r.type, url, r.source || null, r.description || null, r.method || null, r.category || null],
        );
        inserted++;
      }
    } catch(e) {
      console.warn(`  ⚠️  ${r.name} 写入失败: ${e.message}`);
      skipped++;
    }
  }

  await conn.end();

  // 4. 统计
  console.log('\n=== 完成 ===');
  console.log(`  新增: ${inserted}`);
  console.log(`  更新: ${updated}`);
  console.log(`  跳过: ${skipped} (失败或无直链)`);
  console.log(`  总计处理: ${records.length - skipped} / ${records.length}`);
}

main().catch(err => {
  console.error('❌ 运行时错误:', err.message);
  console.error(err.stack);
  process.exit(1);
});
