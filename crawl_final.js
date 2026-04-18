/**
 * 最终版爬虫 - 处理剩余所有可抓取项
 */
const puppeteer = require('puppeteer');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const path = require('path');
const fs = require('fs');

const BROWSER_ARGS = [
  '--no-sandbox', '--disable-setuid-sandbox',
  '--disable-dev-shm-usage', '--disable-gpu',
  '--disable-software-rasterizer', '--disable-web-security',
];

function httpGetBuffer(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36' },
      timeout: 15000,
    };
    const req = lib.request(reqOptions, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        return resolve(httpGetBuffer(res.headers.location));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

// ─── 酷我音乐（直接用拦截到的 API 直链）─────────────────────────────
async function crawlKuwo() {
  console.log('  → 酷我音乐: 拦截 API 请求获取直链');
  const browser = await puppeteer.launch({ args: BROWSER_ARGS, headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');

  const apkRequests = [];
  page.on('request', req => {
    const url = req.url();
    if (/\.apk/i.test(url)) apkRequests.push(url);
  });

  await page.goto('https://kuwo.cn/down', { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 3000));

  // 点击任一"确认并下载"
  await page.evaluate(() => {
    const btns = document.querySelectorAll('a.btn');
    for (const b of btns) {
      if (b.innerText.includes('确认') && b.innerText.includes('下载')) {
        b.click();
        break;
      }
    }
  });
  await new Promise(r => setTimeout(r, 3000));

  await browser.close();

  if (apkRequests.length > 0) {
    // 去重，只取 pkgdown.kuwo.cn 的（真实 APK）
    const realApks = apkRequests.filter(u => u.includes('pkgdown.kuwo.cn') && /\.apk/i.test(u));
    return {
      url: realApks[0] || apkRequests[0],
      method: 'api-intercept',
      allFound: [...new Set(realApks.length > 0 ? realApks : apkRequests)],
    };
  }
  return { url: null, method: 'none' };
}

// ─── 网易云音乐 ─────────────────────────────────────────────────
async function crawlNetEase() {
  console.log('  → 网易云音乐: 尝试获取下载页');
  const browser = await puppeteer.launch({ args: BROWSER_ARGS, headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');

  const apkRequests = [];
  page.on('request', req => {
    const url = req.url();
    if (/\.apk/i.test(url) || (url.includes('126.net') && url.includes('apk'))) {
      apkRequests.push(url);
    }
  });

  // 逐步等待加载
  await page.goto('https://music.163.com/#/download', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 10000));

  // 尝试点击"车载端"下载按钮
  const clicked = await page.evaluate(() => {
    // 找所有含有车载端/下载文本的元素
    const allEls = document.querySelectorAll('*');
    for (const el of allEls) {
      if (el.innerText && el.innerText.includes('车载端') && el.querySelector('img')) {
        // 找这个父容器下的按钮
        const parent = el.closest('[class*="card"]') || el.parentElement;
        if (parent) {
          const btns = parent.querySelectorAll('[class*="btn"], [class*="button"], a');
          for (const btn of btns) {
            if (btn.innerText.includes('下载')) { btn.click(); return 'found'; }
          }
        }
      }
    }
    // 也找 data-log 元素
    const logEl = document.querySelector('[data-log*="btn_web_download"]');
    if (logEl) { logEl.click(); return 'found-data-log'; }
    return 'not-found';
  });
  console.log(`  点击结果: ${clicked}`);
  await new Promise(r => setTimeout(r, 3000));

  await browser.close();

  if (apkRequests.length > 0) {
    return {
      url: apkRequests.find(u => /\.apk/i.test(u)) || apkRequests[0],
      method: 'apk-request',
      allFound: [...new Set(apkRequests)],
    };
  }
  return { url: null, method: 'none' };
}

// ─── 智车桌面 ───────────────────────────────────────────────────
async function crawlYxyyds() {
  console.log('  → 智车桌面: 分析下载链接');
  const browser = await puppeteer.launch({ args: BROWSER_ARGS, headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');

  const apkRequests = [];
  page.on('request', req => {
    const url = req.url();
    if (/\.apk/i.test(url)) apkRequests.push(url);
  });

  await page.goto('https://www.yxyyds.cn/download.html', { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 5000));

  // 点击版本标签
  const versions = ['公众版', 'AOSP', '7870', '高通', '比亚迪'];
  for (const ver of versions) {
    const clicked = await page.evaluate((v) => {
      const allEls = document.querySelectorAll('*');
      for (const el of allEls) {
        if (el.childNodes.length === 1 && el.innerText.trim() === v) {
          el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          return 'clicked';
        }
      }
      return 'not-found';
    }, ver);
    if (clicked === 'clicked') {
      console.log(`  已点击版本: ${ver}`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // 点击立即下载
  await page.evaluate(() => {
    const btns = document.querySelectorAll('a, button');
    for (const btn of btns) {
      if (btn.innerText.trim() === '立即下载') {
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        break;
      }
    }
  });
  await new Promise(r => setTimeout(r, 3000));

  await browser.close();

  if (apkRequests.length > 0) {
    return { url: apkRequests[0], method: 'request-intercept', allFound: [...new Set(apkRequests)] };
  }
  return { url: null, method: 'none' };
}

// ─── 汽水音乐 ───────────────────────────────────────────────────
async function crawlQishui() {
  console.log('  → 汽水音乐: hover Android 按钮');
  const browser = await puppeteer.launch({ args: BROWSER_ARGS, headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');

  const apkRequests = [];
  page.on('request', req => {
    const url = req.url();
    if (/\.apk/i.test(url)) apkRequests.push(url);
  });

  await page.goto('https://music.douyin.com/qishui', { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 5000));

  // 精确 hover 到 .download-button.android
  try {
    await page.hover('.download-button.android');
    console.log('  Hovered .download-button.android');
    await new Promise(r => setTimeout(r, 4000));

    const qrInfo = await page.evaluate(() => {
      const apkPattern = /https?:\/\/[^\s"'<>]+\.apk[^\s"'<>]*/gi;
      const apkLinks = [];
      document.querySelectorAll('a[href]').forEach(a => {
        if (apkPattern.test(a.getAttribute('href'))) apkLinks.push(a.getAttribute('href'));
      });
      const qrImgs = [];
      document.querySelectorAll('img[src]').forEach(img => {
        const src = img.getAttribute('src') || '';
        if (src.includes('qr') || src.includes('qrcode')) qrImgs.push(src);
      });
      return { apkLinks: [...new Set(apkLinks)], qrImgs };
    });

    if (qrInfo.qrImgs.length > 0) {
      console.log(`  找到二维码: ${qrInfo.qrImgs[0]}`);
      try {
        const qrUrl = qrInfo.qrImgs[0].startsWith('//') ? 'https:' + qrInfo.qrImgs[0] : qrInfo.qrImgs[0];
        const imgData = await httpGetBuffer(qrUrl);
        const tmpPath = path.join(__dirname, 'qishui_qr.png');
        fs.writeFileSync(tmpPath, imgData);
        console.log(`  二维码已保存: ${tmpPath}`);
      } catch {}
    }

    if (qrInfo.apkLinks.length > 0) {
      await browser.close();
      return { url: qrInfo.apkLinks[0], method: 'hover-apk', allFound: qrInfo.apkLinks };
    }
  } catch (e) {
    console.log(`  hover 异常: ${e.message}`);
  }

  await browser.close();
  if (apkRequests.length > 0) {
    return { url: apkRequests[0], method: 'request-intercept', allFound: [...new Set(apkRequests)] };
  }
  return { url: null, method: 'none' };
}

// ─── 高德地图手机版 - 尝试找二维码并解码 ───────────────────────────
async function crawlAmapMobile() {
  console.log('  → 高德地图手机版: 查找二维码');
  const browser = await puppeteer.launch({ args: BROWSER_ARGS, headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');

  await page.goto('https://mobile.amap.com/cn/', { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 4000));

  // 找二维码图片（需要放大等 JS 渲染）
  const qrInfo = await page.evaluate(() => {
    // 找含 QR 的 img
    let qrSrc = null;
    document.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src') || '';
      const alt = img.getAttribute('alt') || '';
      const parentTxt = (img.parentElement ? img.parentElement.innerText : '') + alt;
      if ((src.includes('qr') || src.includes('QR') || alt.includes('qr') || alt.includes('QR') || parentTxt.includes('扫一扫'))
          && (src.endsWith('.png') || src.endsWith('.jpg') || src.endsWith('.jpeg') || src.includes('data:'))) {
        qrSrc = src;
      }
    });
    // 也有可能在 canvas 里
    const canvases = [];
    document.querySelectorAll('canvas').forEach(c => canvases.push({ w: c.width, h: c.height }));
    return { qrSrc, canvases };
  });

  console.log(`  二维码图片: ${qrInfo.qrSrc ? '找到' : '未找到'}`);
  console.log(`  Canvas 数量: ${qrInfo.canvases.length} (${JSON.stringify(qrInfo.canvases.slice(0, 3))})`);

  // 如果有 canvas，画布内容可能是二维码，尝试获取 base64
  if (qrInfo.canvases.some(c => c.w > 50 && c.h > 50)) {
    const qrBase64 = await page.evaluate(() => {
      const canvases = document.querySelectorAll('canvas');
      for (const c of canvases) {
        if (c.width > 50 && c.height > 50) {
          try { return c.toDataURL('image/png'); } catch {}
        }
      }
      return null;
    });
    if (qrBase64) {
      console.log('  找到 Canvas 二维码 (base64)，尝试保存...');
      try {
        const imgData = Buffer.from(qrBase64.split(',')[1], 'base64');
        fs.writeFileSync(path.join(__dirname, 'amap_qr.png'), imgData);
        console.log('  Canvas 二维码已保存到 amap_qr.png');
      } catch {}
    }
  }

  await browser.close();
  return { url: null, method: 'qr-not-found', note: '高德手机版需要扫码下载，已尝试找二维码但未找到可解码图片' };
}

// ─── 主程序 ───────────────────────────────────────────────────────
async function main() {
  const outputPath = path.join(__dirname, 'output.json');
  const data = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
  const failedItems = data.results.filter(r => r.status !== 'ok');

  console.log(`\n=== 最终版 === 剩余 ${failedItems.length} 项\n`);

  for (const item of failedItems) {
    console.log(`\n[${item.name}] ${item.type}`);

    let result = null;

    try {
      if (item.name === '酷我音乐') {
        result = await crawlKuwo();
      } else if (item.name === '酷我音乐极简版') {
        // 与酷我音乐同一页面，请求会一起拦截到
        const r = await crawlKuwo();
        // 找极简版链接
        const lite = r.allFound?.find(u => u.includes('lite'));
        result = { url: lite || r.url, method: r.method + '-lite', allFound: r.allFound };
      } else if (item.name === '网易云音乐') {
        result = await crawlNetEase();
      } else if (item.name === '智车桌面 公签版' || item.name === '智车桌面 普通版') {
        result = await crawlYxyyds();
      } else if (item.name === '汽水音乐') {
        result = await crawlQishui();
      } else if (item.name === '高德地图' && item.type === '手机版') {
        result = await crawlAmapMobile();
      } else {
        console.log('  ⏭ 跳过');
        continue;
      }

      if (result) {
        console.log(`  方法: ${result.method}`);
        if (result.url) {
          console.log(`  ✅ 找到: ${result.url}`);
          item.url = result.url;
          item.status = 'ok';
          item.finalMethod = result.method;
        } else {
          console.log(`  ❌ ${result.note || '未找到'}`);
          item.finalNote = result.note || null;
        }
        if (result.allFound && result.allFound.length > 0) {
          console.log(`  备选: ${result.allFound.slice(0, 3).join(' | ')}`);
        }
      }
    } catch (e) {
      console.log(`  ❌ 异常: ${e.message}`);
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  const success = data.results.filter(r => r.status === 'ok').length;
  const total = data.results.length;
  data.successCount = success;
  data.finalDone = true;

  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`\n\n✅ 最终统计: ${success}/${total}`);
  console.log(`📄 结果: ${outputPath}`);

  const still = data.results.filter(r => r.status !== 'ok');
  if (still.length > 0) {
    console.log(`\n⚠️  无法抓取 (${still.length} 项，需人工处理):`);
    still.forEach(r => {
      console.log(`  - ${r.name} (${r.type}): ${r.finalNote || r.description || '官方无直链'}`);
    });
  }
}

main().catch(e => { console.error(e); process.exit(1); });
