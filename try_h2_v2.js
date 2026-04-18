/**
 * 继续试探氢桌面吉利版/公签版 URL
 */
const https = require('https');

function headRequest(url) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', timeout: 8000 }, res => {
      resolve({ url, status: res.statusCode, location: res.headers.location || null });
    });
    req.on('error', e => resolve({ url, status: '错误: ' + e.message }));
    req.on('timeout', () => resolve({ url, status: '超时' }));
    req.end();
  });
}

async function main() {
  // 已知普通版: https://vv.hyjidi.com/app/122/普通版.apk (200)
  // 试试更多变体
  const candidates = [
    'https://vv.hyjidi.com/app/122/吉利版.apk',
    'https://vv.hyjidi.com/app/122/吉利版1.apk',
    'https://vv.hyjidi.com/app/122/吉利.apk',
    'https://vv.hyjidi.com/app/122/吉利_版.apk',
    'https://vv.hyjidi.com/app/122/公签版.apk',
    'https://vv.hyjidi.com/app/122/公签版1.apk',
    'https://vv.hyjidi.com/app/122/公签.apk',
    'https://vv.hyjidi.com/app/122/公版.apk',
    // 数字结尾
    'https://vv.hyjidi.com/app/122/吉利版2.apk',
    'https://vv.hyjidi.com/app/122/公签版2.apk',
    // 其他后缀
    'https://vv.hyjidi.com/app/122/普通版_吉利.apk',
    'https://vv.hyjidi.com/app/122/吉利_公签.apk',
    // 用 Puppeteer 抓页面上看到的实际链接
  ];

  console.log('试探吉利版/公签版:\n');
  for (const url of candidates) {
    const r = await headRequest(url);
    const mark = r.status === 200 ? '✅' : r.status === 404 ? '❌' : '⏰';
    console.log(`${mark} [${r.status}] ${url}`);
    if (r.location) console.log(`   → ${r.location}`);
  }

  // 用 Puppeteer 访问氢桌面下载页，看真正的下载链接
  console.log('\n尝试 Puppeteer 抓取页面内容...');
  try {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    await page.goto('https://www.hyjidi.com/app/122/', { waitUntil: 'networkidle2', timeout: 15000 });
    const content = await page.content();
    // 搜索所有 .apk 链接
    const apkLinks = await page.$$eval('a[href$=".apk"]', els => els.map(e => e.href));
    console.log('页面中的 APK 链接:', apkLinks);
    await browser.close();
  } catch(e) {
    console.log('Puppeteer 错误:', e.message);
  }
}

main();
