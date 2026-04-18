/**
 * Puppeteer 点击氢桌面下载按钮，抓取真实的 APK URL
 */
const puppeteer = require('puppeteer');

async function main() {
  console.log('启动 Puppeteer...\n');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // 访问氢桌面下载页
  await page.goto('https://www.hyjidi.com/app/122/', { waitUntil: 'networkidle2', timeout: 20000 });
  console.log('页面标题:', await page.title());

  // 打印页面文本内容（看有哪些版本）
  const text = await page.evaluate(() => document.body.innerText);
  console.log('\n页面文本片段:', text.substring(0, 500));

  // 查找所有按钮/链接
  const buttons = await page.$$eval('button, a[href]', els => els.map(e => ({
    tag: e.tagName,
    text: e.innerText?.trim(),
    href: e.href || null,
  })).filter(x => x.text || x.href));
  console.log('\n按钮/链接:', JSON.stringify(buttons.slice(0, 20), null, 2));

  // 尝试拦截下载请求
  let downloadUrl = null;
  await page.setRequestInterception(true);
  page.on('request', req => {
    const url = req.url();
    if (url.endsWith('.apk') || url.includes('.apk?')) {
      downloadUrl = url;
      console.log('\n🎯 捕获 APK 下载请求:', url);
    }
    req.continue();
  });

  // 找下载按钮并点击
  const downloadBtn = await page.$('button:has-text("下载"), a:has-text("下载"), [class*="download"]');
  if (downloadBtn) {
    console.log('\n点击下载按钮...');
    await downloadBtn.click().catch(e => console.log('点击失败:', e.message));
    await new Promise(r => setTimeout(r, 3000));
    if (downloadUrl) console.log('捕获到 URL:', downloadUrl);
  } else {
    console.log('\n未找到下载按钮，尝试拦截所有 .apk 请求...');
    await new Promise(r => setTimeout(r, 3000));
  }

  await browser.close();
}

main().catch(e => { console.error('错误:', e.message); process.exit(1); });
