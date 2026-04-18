const https = require('https');
const http = require('http');
const { URL } = require('url');

async function httpGetHtml(url) {
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
  console.log(`[crawlLecoDesktop] called with name="${name}"`);
  try {
    const html = await httpGetHtml(excelUrl);
    const apkLinks = extractApkLinks(html, excelUrl);
    console.log(`[crawlLecoDesktop] apkLinks.length=${apkLinks.length}`);
    if (apkLinks.length > 0) {
      let target = apkLinks[0];
      console.log(`[crawlLecoDesktop] default target: ${target.split('/').pop()}`);
      if (name.includes('公签') || name.includes('公签版')) {
        console.log(`[crawlLecoDesktop] checking 公签 condition (name.includes('公签') = ${name.includes('公签')})`);
        const gq = apkLinks.find(u => decodeURIComponent(u).includes('公签_sign.apk'));
        console.log(`[crawlLecoDesktop] 公签 find result: ${gq ? gq.split('/').pop() : 'undefined'}`);
        if (gq) target = gq;
      } else if (name.includes('普通') || name.includes('普通版')) {
        const pt = apkLinks.find(u => decodeURIComponent(u).includes('_普通_sign.apk'));
        if (pt) target = pt;
      }
      console.log(`[crawlLecoDesktop] returning: ${target.split('/').pop()}`);
      return { url: target, method: 'html-parse', allFound: apkLinks };
    }
  } catch (e) {
    console.log(`[crawlLecoDesktop] error: ${e.message}`);
  }
  return { url: null, method: 'none' };
}

// Test
(async () => {
  const result = await crawlLecoDesktop('https://lecoauto.com/index/download', '乐酷桌面公签版');
  console.log('Final result.url:', result.url ? result.url.split('/').pop() : 'null');
})();
