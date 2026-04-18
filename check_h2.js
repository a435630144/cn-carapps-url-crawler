const mysql = require('mysql2/promise');
mysql.createConnection({
  host: 'mysql.sqlpub.com', port: 3306,
  user: 'b435630144', password: 'ydT2Sqe5E6PMiIWo', database: 'sqlpub2'
}).then(async c => {
  const [rows] = await c.execute("SELECT name, type, url FROM software_craw WHERE name LIKE '氢桌面%'");
  rows.forEach(r => console.log(r.name, '|', r.type, '|', r.url));
  c.end();
}).catch(e => console.error(e.message));
