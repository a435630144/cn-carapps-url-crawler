const XLSX = require('xlsx');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

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
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'zh-CN,zh;q=0.9' },
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

// Simulate the FULL crawler for just one problematic entry
async function simulateOneEntry(name, type, excelUrl, desc) {
  console.log(`\n=== Simulating: ${name} [${type}] ===`);
  console.log(`  excelUrl: ${excelUrl}`);

  let finalUrl = null, method = 'none', allFound = [], note = null;

  // Step ①
  const skipMainStep1 = (name.includes('氢桌面') && (name.includes('吉利') || name.includes('公签')))
    || name.includes('嘟嘟桌面') || name.includes('乐酷桌面');

  if (!skipMainStep1 && excelUrl) {
    console.log('  Step①: trying...');
    try {
      const { status } = await checkUrl(excelUrl);
      console.log('    HTTP', status);
      if (status >= 200 && status < 400) {
        const html = await httpGetHtml(excelUrl);
        const apkLinks = extractApkLinks(html, excelUrl);
        if (apkLinks.length > 0) {
          const apkStatus = await checkUrl(apkLinks[0]);
          if (apkStatus.status === 200) {
            finalUrl = apkLinks[0];
            method = 'html-parse';
            allFound = apkLinks;
            console.log('    ✅ step① html-parse:', finalUrl.split('/').pop());
          }
        }
      }
    } catch (e) {
      console.log('    step① error:', e.message);
    }
  } else {
    console.log('  Step①: SKIPPED (skipMainStep1=true)');
  }

  // Step ②: crawlBySoftware equivalent
  if (!finalUrl) {
    console.log('  Step②: crawlBySoftware...');

    // Simulate crawlBySoftware for 乐酷
    if (name.includes('乐酷')) {
      console.log('    → Leco branch');
      try {
        const html = await httpGetHtml(excelUrl);
        const apkLinks = extractApkLinks(html, excelUrl);
        console.log('    apkLinks:', apkLinks.map(u => u.split('/').pop()));
        if (apkLinks.length > 0) {
          let target = apkLinks[0];
          if (name.includes('公签') || name.includes('公签版')) {
            const gq = apkLinks.find(u => decodeURIComponent(u).includes('公签_sign.apk'));
            console.log('    gq find:', gq ? gq.split('/').pop() : 'undefined');
            if (gq) target = gq;
          } else if (name.includes('普通') || name.includes('普通版')) {
            const pt = apkLinks.find(u => decodeURIComponent(u).includes('_普通_sign.apk'));
            if (pt) target = pt;
          }
          finalUrl = target;
          method = 'html-parse';
          allFound = apkLinks;
          console.log('    ✅ step②:', finalUrl.split('/').pop());
        }
      } catch (e) {
        console.log('    step② error:', e.message);
      }
    } else if (name.includes('哔哩')) {
      console.log('    → Bilibili branch');
      try {
        const html = await httpGetHtml(excelUrl);
        const apkLinks = extractApkLinks(html, excelUrl);
        console.log('    apkLinks:', apkLinks.map(u => u.split('/').pop()));
        if (apkLinks.length > 0) {
          const carApk = apkLinks.find(u => u.includes('bilithings'));
          console.log('    bilithings find:', carApk ? carApk.split('/').pop() : 'undefined');
          finalUrl = carApk || apkLinks.find(u => u.includes('android_tv')) || apkLinks[0];
          method = 'html-parse';
          allFound = apkLinks;
          console.log('    ✅ step②:', finalUrl.split('/').pop());
        }
      } catch (e) {
        console.log('    step② error:', e.message);
      }
    }
  }

  console.log(`\n  最终结果: ${finalUrl ? finalUrl.split('/').pop() : 'null'} (${method})`);
}

async function main() {
  const entries = [
    { name: '乐酷桌面普通版', type: '车机版', excelUrl: 'https://lecoauto.com/index/download', desc: '' },
    { name: '乐酷桌面公签版', type: '车机版', excelUrl: 'https://lecoauto.com/index/download', desc: '' },
    { name: '哔哩哔哩', type: '车机版', excelUrl: 'https://app.bilibili.com/?spm_id_from=333.937.0.0', desc: '' },
  ];

  for (const e of entries) {
    await simulateOneEntry(e.name, e.type, e.excelUrl, e.desc);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
