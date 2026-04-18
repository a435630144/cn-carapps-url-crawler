const https = require('https');
const http = require('http');
const { URL } = require('url');

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
  console.log('[step① extractApkLinks] sectionLinks:', sectionLinks.map(u => u.split('/').pop()));
  if (sectionLinks.length === 0) {
    const globalPattern = /href="(https?:\/\/[^"']+\.apk[^"']*)"[^>]*>/gi;
    const matches = [];
    let m;
    while ((m = globalPattern.exec(html)) !== null) {
      const url = m[1].split('?')[0];
      if (!matches.includes(url)) matches.push(url);
    }
    console.log('[step① extractApkLinks] global (no sections):', matches.map(u => u.split('/').pop()));
    return matches;
  }
  return sectionLinks;
}

// Simulate the main flow for 乐酷桌面公签版
async function simulateMainFlow() {
  const name = '乐酷桌面公签版';
  const type = '车机版';
  const excelUrl = 'https://lecoauto.com/index/download';

  const skipMainStep1 = name.includes('乐酷桌面');
  console.log('=== main flow for:', name, '===');
  console.log('skipMainStep1:', skipMainStep1);

  let finalUrl = null, method = 'none';

  if (!skipMainStep1 && excelUrl) {
    console.log('→ step①: 尝试直接解析');
    const { status } = await checkUrl(excelUrl);
    console.log('  HTTP', status, '→', excelUrl);
    if (status >= 200 && status < 400) {
      try {
        const html = await httpGetHtml(excelUrl);
        const apkLinks = extractApkLinks(html, excelUrl);
        console.log('  apkLinks count:', apkLinks.length);
        if (apkLinks.length > 0) {
          const apkStatus = await checkUrl(apkLinks[0]);
          console.log('  apkLinks[0] status:', apkStatus.status, apkLinks[0].split('/').pop());
          if (apkStatus.status === 200) {
            finalUrl = apkLinks[0];
            method = 'html-parse';
            console.log('  ✅ step① html-parse:', finalUrl.split('/').pop());
          }
        }
      } catch (e) {
        console.log('  step① error:', e.message);
      }
    }
  } else {
    console.log('→ step①: 跳过');
  }

  console.log('  最终 finalUrl:', finalUrl ? finalUrl.split('/').pop() : 'null');
}

simulateMainFlow().catch(console.error);
