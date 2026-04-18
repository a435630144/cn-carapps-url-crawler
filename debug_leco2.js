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
    }).on('error', reject).on('timeout', r => { r.destroy(); reject(new Error('Timeout')); }).end();
  });
}

async function main() {
  const name = '乐酷桌面公签版';
  const excelUrl = 'https://lecoauto.com/index/download';
  const html = await httpGetHtml(excelUrl);

  // Test current crawler logic: extractApkLinks is called from crawlBySoftware
  // which uses sectionPattern + apkPattern
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

  console.log('name.includes 公签:', name.includes('公签'));
  console.log('apkLinks:', sectionLinks.map(l => l.split('/').pop()));

  if (sectionLinks.length > 0) {
    let target = sectionLinks[0];
    if (name.includes('公签') || name.includes('公签版')) {
      const gq = sectionLinks.find(u => decodeURIComponent(u).includes('公签_sign.apk'));
      console.log('gq find result:', gq ? gq.split('/').pop() : 'undefined');
      if (gq) target = gq;
    }
    console.log('最终选择:', target.split('/').pop());
  }
}
main().catch(e => console.log('错误:', e.message));
