const XLSX = require('xlsx');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const excelPath = 'D:/OneDrive/自学编程/claude code/work3/车机软件汇总.xlsx';
const wb = XLSX.readFile(excelPath);
const ws = wb.Sheets['Sheet1'];
const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', range: 2 });

const COL_NAME = 0, COL_TYPE = 1, COL_URL = 2;

function httpGetHtml(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    lib.request({
      hostname: parsed.hostname, port: parsed.port || 443,
      path: parsed.pathname + parsed.search, method: 'GET',
      headers: {'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'zh-CN,zh;q=0.9'},
      timeout: 15000,
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    }).on('error', reject).on('timeout', () => { req.destroy(); reject(new Error('Timeout')); }).end();
  });
}

function extractApkLinks(html, baseUrl) {
  const sectionPattern = /<h2[^>]*>(.*?)<\/h2>([\s\S]*?)(?=<h2|$)/gi;
  const apkPattern = /href="(https?:\/\/[^"']+\.apk[^"']*)"[^>]*>([\s\S]*?)<\/a>/gi;
  const results = [];
  let sMatch;
  while ((sMatch = sectionPattern.exec(html)) !== null) {
    const sectionId = sMatch[1].replace(/<[^>]+>/g, '').trim().replace(/^#\s*/, '').trim();
    const sectionHtml = sMatch[2];
    const apkLinks = [];
    let aMatch;
    while ((aMatch = apkPattern.exec(sectionHtml)) !== null) {
      const rawText2 = aMatch[2].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
      apkLinks.push({ url: aMatch[1].split('?')[0], text: rawText2 });
    }
    if (apkLinks.length > 0) results.push({ sectionId, apkLinks });
  }
  const sectionLinks = results.flatMap(s => s.apkLinks.map(a => a.url));
  if (sectionLinks.length === 0) {
    const globalPattern = /href="(https?:\/\/[^"']+\.apk[^"']*)"[^>]*>/gi;
    const matches = [];
    let m;
    while ((m = globalPattern.exec(html)) !== null) {
      const url = m[1].split('?')[0];
      if (!matches.includes(url)) matches.push(url);
    }
    return matches;
  }
  return sectionLinks;
}

async function crawlLecoDesktop(excelUrl, name = '') {
  console.log(`    [专用] 乐酷桌面 → ${name}`);
  try {
    const html = await httpGetHtml(excelUrl);
    const apkLinks = extractApkLinks(html, excelUrl);
    console.log(`    apkLinks count: ${apkLinks.length}`);
    console.log(`    apkLinks: ${apkLinks.map(u => u.split('/').pop())}`);
    if (apkLinks.length > 0) {
      let target = apkLinks[0];
      if (name.includes('公签') || name.includes('公签版')) {
        const gq = apkLinks.find(u => decodeURIComponent(u).includes('公签_sign.apk'));
        console.log(`    公签查找: ${gq ? gq.split('/').pop() : 'undefined'}`);
        if (gq) target = gq;
      } else if (name.includes('普通') || name.includes('普通版')) {
        const pt = apkLinks.find(u => decodeURIComponent(u).includes('_普通_sign.apk'));
        if (pt) target = pt;
      }
      console.log(`    最终选择: ${target.split('/').pop()}`);
      return { url: target, method: 'html-parse', allFound: apkLinks };
    }
  } catch (e) {
    console.log(`    乐酷 HTTP 失败: ${e.message}`);
  }
  return { url: null, method: 'none' };
}

async function main() {
  const lecoRows = rawRows.filter(r => r[COL_NAME] && r[COL_NAME].includes('乐酷'));
  for (const row of lecoRows) {
    const name = String(row[COL_NAME] || '').trim();
    const type = String(row[COL_TYPE] || '').trim();
    const excelUrl = String(row[COL_URL] || '').trim();

    console.log(`\n▶ ${name} [${type}]`);
    console.log(`  excelUrl: ${excelUrl}`);

    const skipMainStep1 = name.includes('乐酷桌面');
    console.log(`  skipMainStep1: ${skipMainStep1}`);

    if (!skipMainStep1 && excelUrl) {
      console.log('  → 走step①');
    } else {
      console.log('  → 跳step①，进step②专用');
      const result = await crawlLecoDesktop(excelUrl, name);
      console.log(`  结果: ${result.url ? result.url.split('/').pop() : 'null'} (${result.method})`);
    }
  }
}
main().catch(e => { console.error(e); process.exit(1); });
