const https = require('https');
const http = require('http');
const { URL } = require('url');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const XLSX = require('xlsx');

const excelPath = 'D:/OneDrive/自学编程/claude code/work3/车机软件汇总.xlsx';
const wb = XLSX.readFile(excelPath);
const ws = wb.Sheets['Sheet1'];
const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', range: 2 });
const COL_NAME = 0, COL_TYPE = 1, COL_URL = 2, COL_DESC = 3;

async function httpGetHtml(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.request({
      hostname: parsed.hostname, port: parsed.port || 443,
      path: parsed.pathname + parsed.search, method: 'GET',
      headers: {'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'zh-CN,zh;q=0.9'},
      timeout: 15000,
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

async function checkUrl(url) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.request({
      hostname: parsed.hostname, port: parsed.port || 443,
      path: parsed.pathname + parsed.search, method: 'HEAD',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 10000,
    }, res => {
      resolve({ status: res.statusCode, url: res.headers.location || url });
      req.destroy();
    });
    req.on('error', e => resolve({ status: 0, url }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, url }); });
    req.end();
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

// Simulate the full main flow with step① and step② for Leco 公签版
async function simulateFullMainFlow() {
  // Get just the Leco 公签版 row
  const lecoRows = rawRows.filter(r => r[COL_NAME] && r[COL_NAME].includes('乐酷桌面公签版'));
  if (lecoRows.length === 0) { console.log('Row not found'); return; }
  const row = lecoRows[0];
  const name = String(row[COL_NAME] || '').trim();
  const type = String(row[COL_TYPE] || '').trim();
  const excelUrl = String(row[COL_URL] || '').trim();
  const desc = String(row[COL_DESC] || '').trim();

  console.log('\n=== FULL MAIN FLOW for:', name, '===');
  console.log('  excelUrl:', excelUrl);
  console.log('  desc:', desc.substring(0, 80));

  let finalUrl = null, method = 'none', allFound = [], note = null;

  // Step ①: 先验证 Excel 官方 URL 是否直接可用
  const skipMainStep1 = name.includes('乐酷桌面');
  console.log('  skipMainStep1:', skipMainStep1);

  if (!skipMainStep1 && excelUrl) {
    console.log('  → step①: 尝试直接解析');
    try {
      const { status } = await checkUrl(excelUrl);
      console.log('    HTTP', status, '→', excelUrl);
      if (status >= 200 && status < 400) {
        try {
          const html = await httpGetHtml(excelUrl);
          const apkLinks = extractApkLinks(html, excelUrl);
          console.log('    apkLinks count:', apkLinks.length);
          if (apkLinks.length > 0) {
            const apkStatus = await checkUrl(apkLinks[0]);
            if (apkStatus.status === 200) {
              finalUrl = apkLinks[0];
              method = 'html-parse';
              allFound = apkLinks;
              console.log('    ✅ step① html-parse:', finalUrl.split('/').pop());
            }
          }
        } catch (e) {
          console.log('    step① HTML解析失败:', e.message);
        }
      }
    } catch (e) {
      console.log('    step① HTTP失败:', e.message);
    }
  } else {
    console.log('  → step①: 跳过（name includes 乐酷桌面）');
  }

  // Step ②: 走专用爬取
  if (!finalUrl) {
    console.log('  → step②: 调用 crawlBySoftware → crawlLecoDesktop');

    // In crawlBySoftware, the Leco handling:
    // result = await crawlLecoDesktop(excelUrl, name);
    // There's NO override for 公签 here anymore

    // Simulate crawlLecoDesktop
    try {
      const html = await httpGetHtml(excelUrl);
      const apkLinks = extractApkLinks(html, excelUrl);
      console.log('  step② apkLinks count:', apkLinks.length);
      if (apkLinks.length > 0) {
        let target = apkLinks[0];
        console.log('  step② default target:', target.split('/').pop());
        console.log('  step② name.includes 公签:', name.includes('公签'));
        if (name.includes('公签') || name.includes('公签版')) {
          const gq = apkLinks.find(u => decodeURIComponent(u).includes('公签_sign.apk'));
          console.log('  step② 公签 find result:', gq ? gq.split('/').pop() : 'undefined');
          if (gq) target = gq;
        } else if (name.includes('普通') || name.includes('普通版')) {
          const pt = apkLinks.find(u => decodeURIComponent(u).includes('_普通_sign.apk'));
          if (pt) target = pt;
        }
        console.log('  step② final target:', target.split('/').pop());
        finalUrl = target;
        method = 'html-parse';
        allFound = apkLinks;
        console.log('  ✅ step② html-parse:', finalUrl.split('/').pop());
      }
    } catch (e) {
      console.log('  step② error:', e.message);
    }
  }

  console.log('\n=== 最终结果 ===');
  console.log('  finalUrl:', finalUrl ? finalUrl.split('/').pop() : 'null');
  console.log('  method:', method);
}

simulateFullMainFlow().catch(e => { console.error(e); process.exit(1); });
