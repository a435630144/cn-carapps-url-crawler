/**
 * 重新抓取氢桌面三个版本的正确 APK URL
 * 普通版 / 吉利版 / 公签版
 */
const https = require('https');
const http  = require('http');
const { URL } = require('url');

const BASE = 'https://vv.hyjidi.com';

// 直接请求看看有哪些版本
function fetch(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const mod = parsedUrl.protocol === 'https:' ? https : http;
    mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
      },
      timeout: 10000,
    }, res => {
      // 跟随最多10次重定向
      if (res.headers.location && redirects < 10) {
        const loc = res.headers.location;
        const next = loc.startsWith('http') ? loc : (parsedUrl.origin + loc);
        console.log(`  [${redirects+1}] 重定向 → ${next}`);
        fetch(next, redirects + 1).then(resolve).catch(reject);
        return;
      }
      // 返回最终 URL 和状态码
      resolve({ finalUrl: url, status: res.statusCode, headers: res.headers });
    }).on('error', reject).on('timeout', () => reject(new Error('超时')));
  });
}

async function main() {
  console.log('\n=== 抓取氢桌面下载页 ===\n');

  // 尝试访问主下载页
  const pages = [
    'https://www.hyjidi.com/app/122/',
    'https://vv.hyjidi.com/app/122/',
  ];

  for (const page of pages) {
    try {
      console.log(`访问: ${page}`);
      const { finalUrl, status, headers } = await fetch(page);
      console.log(`  最终URL: ${finalUrl}`);
      console.log(`  状态: ${status}`);
      console.log(`  Content-Type: ${headers['content-type']}`);
      console.log(`  Location: ${headers['location'] || '(无)'}`);
    } catch(e) {
      console.log(`  ❌ ${e.message}`);
    }
  }
}

main();
