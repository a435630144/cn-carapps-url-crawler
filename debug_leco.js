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
  console.log('Section提取:', sectionLinks.length, '个');
  if (results.length > 0) {
    results.forEach(r => console.log('  Section:', r.sectionId, '->', r.apkLinks.map(a => a.url.split('/').pop()).join(', ')));
  }
  if (sectionLinks.length === 0) {
    const globalPattern = /href="(https?:\/\/[^"']+\.apk[^"']*)"[^>]*>/gi;
    const matches = [];
    let m;
    while ((m = globalPattern.exec(html)) !== null) {
      const url = m[1].split('?')[0];
      if (!matches.includes(url)) matches.push(url);
    }
    console.log('全局提取:', matches.length, '个');
    return matches;
  }
  return sectionLinks;
}

async function main() {
  const html = await httpGetHtml('https://lecoauto.com/index/download');
  const links = extractApkLinks(html, 'https://lecoauto.com/index/download');
  console.log('最终结果:', links.map(l => l.split('/').pop()));
}
main().catch(e => console.log('错误:', e.message));
