const puppeteer = require('puppeteer');

const BROWSER_ARGS = [
  '--no-sandbox', '--disable-setuid-sandbox',
  '--disable-dev-shm-usage', '--disable-gpu',
  '--disable-software-rasterizer', '--disable-web-security',
];

async function findKuwoAPK() {
  const browser = await puppeteer.launch({ args: BROWSER_ARGS, headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');

  const apkRequests = [];
  page.on('request', req => {
    const u = req.url();
    if (/\.apk/i.test(u) && (u.includes('kuwo') || u.includes('mobilebasedata'))) {
      console.log('REQUEST:', u);
      apkRequests.push(u);
    }
  });

  page.on('response', async res => {
    const u = res.url();
    const status = res.status();
    if (/\.apk/i.test(u) && status === 200) {
      console.log('APK RESPONSE:', status, u);
    }
  });

  await page.goto('https://www.kuwo.cn/down', { waitUntil: 'networkidle2', timeout: 30000 }).catch(e => console.log('Goto error:', e.message));
  await new Promise(r => setTimeout(r, 5000));

  // Click "公版" tab
  const tabs = await page.evaluate(() => {
    const result = [];
    document.querySelectorAll('*').forEach(el => {
      if (el.childNodes.length === 1 && el.innerText && el.innerText.trim()) {
        const t = el.innerText.trim();
        if (t === '公版' || t === '极简版') result.push(t + ' -> ' + el.tagName + ' class:' + el.className);
      }
    });
    return result;
  });
  console.log('Tabs found:', tabs);

  await new Promise(r => setTimeout(r, 3000));
  await browser.close();
  console.log('All APK requests:', apkRequests);
}

findKuwoAPK().catch(console.error);
