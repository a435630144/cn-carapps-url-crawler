/**
 * 抓取氢桌面三个版本的正确 URL
 * 已知普通版: https://vv.hyjidi.com/app/122/普通版1.apk
 * 猜测吉利版/公签版路径
 */
const https = require('https');
const http  = require('http');

function headRequest(url) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const req = mod.request(url, { method: 'HEAD', timeout: 8000 }, res => {
      resolve({ url, status: res.statusCode, location: res.headers.location || null });
    });
    req.on('error', e => resolve({ url, status: '错误: ' + e.message }));
    req.on('timeout', () => resolve({ url, status: '超时' }));
    req.end();
  });
}

async function main() {
  // 尝试不同的 URL 模式
  const candidates = [
    // 模式1: 不同文件名
    'https://vv.hyjidi.com/app/122/普通版.apk',
    'https://vv.hyjidi.com/app/122/吉利版.apk',
    'https://vv.hyjidi.com/app/122/公签版.apk',
    // 模式2: 带版本号
    'https://vv.hyjidi.com/app/122/普通版2.apk',
    'https://vv.hyjidi.com/app/122/吉利版1.apk',
    'https://vv.hyjidi.com/app/122/公签版1.apk',
    // 模式3: 官方下载页（可能有 JS 渲染）
    'https://www.hyjidi.com/app/122/',
    'https://www.hyjidi.com/app/122',
  ];

  console.log('试探氢桌面 APK URL:\n');
  for (const url of candidates) {
    const r = await headRequest(url);
    const mark = r.status === 200 ? '✅' : r.status === '超时' ? '⏰' : r.status === '错误: ETIMEDOUT' ? '⏰' : '❌';
    console.log(`${mark} [${r.status}] ${url}`);
    if (r.location) console.log(`   → 重定向: ${r.location}`);
  }
}

main();
