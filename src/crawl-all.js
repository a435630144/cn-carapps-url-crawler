/**
 * src/crawl-all.js
 * 动态爬取车机软件 APK 下载链接
 *
 * 策略：
 * 1. HTTP GET → 解析 HTML 中的 APK 直链
 * 2. Puppeteer 拦截 → JS 动态渲染页面的 APK 请求
 * 3. MANUAL Fallback → 爬不到时用硬编码表
 *
 * 用法: node src/crawl-all.js
 */

'use strict';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const fs   = require('fs');
const https = require('https');
const http  = require('http');
const { URL } = require('url');
const XLSX  = require('xlsx');
const puppeteer = require('puppeteer');

const BROWSER_ARGS = [
  '--no-sandbox', '--disable-setuid-sandbox',
  '--disable-dev-shm-usage', '--disable-gpu',
  '--disable-software-rasterizer', '--disable-web-security',
];

// ─── MANUAL 备选表 ───────────────────────────────────────────────
const MANUAL = {
  '高德地图|车机版':  'https://mapdownload.autonavi.com/apps/auto/manual/V910/Auto_9.1.0.600087_release_signed.apk?u=65f539dfdf2079ae861142943cdf764f&',
  '高德地图|手机版':  'https://download.autonavi.com/amap/package/C02110001348/Amap_V16.12.0.2027_android_C02110001348_(Build260323142446iSEB5dJI-64).apk',
  '百度地图|车机版':  'https://downapp.baidu.com/original_new/322/1/1/1775832266877/BaiduMapForAuto.apk',
  '百度地图|手机版':  'https://downpack.baidu.com/baidumap_AndroidPhone_1009176a.apk',
  '腾讯地图|车机版':  'https://smart-navi-1258344699.cos.ap-guangzhou.myqcloud.com/ua/apk/TencentMapAuto_default_9.5.0.50_release_20260210161357.apk',
  '网易云音乐|车机版': 'https://d3.music.126.net/f4ceaa5f-ca58-4384-be40-9087f2c02c65.apk',
  'QQ音乐|车机版':     'https://dldir1.qq.com/music/qqmusiccar/10049404-qqmusiccar-3.10.0.6-80dc5dd2bd_commonMv_full-release-signed.apk',
  '酷我音乐|车机版':   'https://pkgdown.kuwo.cn/mbox/kwplayercar_ar_APK_guanwang.apk',
  '酷我音乐极简版|车机版': 'https://pkgdown.kuwo.cn/mbox/kwplayerautolite_C_APK_guanwang_lite.apk',
  '酷狗音乐|车机版':   'https://applabsbssdlbig.kugou.com/202604171425/c8ced6803ce0bf2b843e5523448a7fcb/KugouAuto_v6.1.0_8069_685153ce.apk',
  '汽水音乐|手机版':   'https://lf9-apk.ugapk.cn/package/apk/luna/8986_100189030/luna_43074760a_v8986_100189030_46cc_1775590296.apk?v=1775590302',
  '喜马拉雅|车机版':   'https://apk.pcdn.xmcdn.com/storages/445c-audiofreehighqps/23/BA/GAqhntANMAkfAro9NQRS9RuR.apk',
  '哔哩哔哩|车机版':   'https://dl.hdslb.com/mobile/latest/android_tv_yst/iBiliTV-master.apk',
  '嘟嘟桌面PRO公版|车机版': 'https://file-qiniu2.dudu-lucky.com/filemanage/202512021119597def46440dff4cde91a3424dbfe91e1e.apk',
  '嘟嘟桌面PROMINI版|车机版': 'https://file-n3.dudu-lucky.com:18103/upload/common/20251202210940184dcd6e95564fd2a5c1d6f5cd2ea371.apk',
  '嘟嘟桌面PRO公签版|车机版': 'https://file-qiniu2.dudu-lucky.com/filemanage/202512021119597def46440dff4cde91a3424dbfe91e1e.apk',
  '氢桌面普通版|车机版': 'https://vv.hyjidi.com/app/122/%E6%99%AE%E9%80%9A%E7%89%881.apk',
  '氢桌面吉利版|车机版': 'https://vv.hyjidi.com/app/122/%E5%90%89%E5%88%A9%E8%BD%A6%E5%9E%8B%E4%B8%93%E7%94%A81.apk',
  '氢桌面公签版|车机版': 'https://vv.hyjidi.com/app/122/画中画公签版1.apk',
  '乐酷桌面普通版|车机版': 'https://leco-1252637813.cos.ap-nanjing.myqcloud.com/update/%E4%B9%90%E9%85%B7%E6%A1%8C%E9%9D%A2_1.8.4.7_%E6%99%AE%E9%80%9A_sign.apk',
  '乐酷桌面公签版|车机版': 'https://leco-1252637813.cos.ap-nanjing.myqcloud.com/update/%E4%B9%90%E9%85%B7%E6%A1%8C%E9%9D%A2_1.8.4.7_%E5%85%AC%E7%AD%BE_sign.apk',
  '布丁UI普通版|车机版': 'https://assets.autoshafa.com/apk/buding_bece53692609e838da3cd8e2d5cd9999_1.0.2.v4_V4webwww.apk',
  '布丁UI低版本安卓系统|车机版': 'https://assets.autoshafa.com/apk/buding_bece53692609e838da3cd8e2d5cd9999_1.0.2.v4_V4webwww.apk',
  '智车桌面公签版|车机版': 'https://m407.lanosso.com:446/04171300280224704bb/2026/03/28/9465345b684c93d7e3330ccc9b0192d5.apk',
  '智车桌面普通版|车机版': 'https://m908.lanosso.com:446/04171300280222179bb/2026/03/28/f4383037b964e4279eb144629026b09f.apk',
};

// ─── 工具函数 ───────────────────────────────────────────────────

/** 跟随重定向的 HTTP GET，返回最终 HTML */
async function httpGetHtml(url, followRedirect = true) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.request({
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
      timeout: 15000,
    }, res => {
      if (followRedirect && [301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        const loc = res.headers.location.startsWith('http') ? res.headers.location
          : parsed.protocol + '//' + parsed.host + res.headers.location;
        return httpGetHtml(loc, true).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

/** 检查 URL 是否可访问 (HEAD) */
async function checkUrl(url) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? https : http;
    const req = lib.request({
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'HEAD',
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

/** 从 HTML 中按区块提取 APK（h2 标签分区，按文本内容定位） */
function extractApkLinksBySection(html, baseUrl) {
  // H2 标签格式: <h2># 公版</h2>，用文本内容而非 id 属性分区
  const sectionPattern = /<h2[^>]*>(.*?)<\/h2>([\s\S]*?)(?=<h2|$)/gi;
  // 使用非捕获组 (?:...) 允许 <a> 标签内无文本内容的情况（如 bilithings 的 <a title="车机版"></a>）
  const apkPattern = /href="(https?:\/\/[^"']+\.apk[^"']*)"[^>]*>(?:[\s\S]*?)<\/a>/gi;
  const results = [];
  let sMatch;
  while ((sMatch = sectionPattern.exec(html)) !== null) {
    const rawText = sMatch[1].replace(/<[^>]+>/g, '').trim();
    // 去掉开头的 # 和空格，如 "# 公版" → "公版"
    const sectionId = rawText.replace(/^#\s*/, '').trim();
    const sectionHtml = sMatch[2];
    const apkLinks = [];
    let aMatch;
    while ((aMatch = apkPattern.exec(sectionHtml)) !== null) {
      // 非捕获组 (?:...) 导致 aMatch[2] 不存在，只保留 url 即可
      apkLinks.push({ url: aMatch[1].split('?')[0], text: '' });
    }
    if (apkLinks.length > 0) {
      results.push({ sectionId, apkLinks });
    }
  }
  return results;
}

/** 兼容旧接口：返回扁平化的所有 APK */
function extractApkLinks(html, baseUrl) {
  const bySection = extractApkLinksBySection(html, baseUrl);
  const sectionLinks = bySection.flatMap(s => s.apkLinks.map(a => a.url));
  // 如果 section 提取为空，尝试全局无结构提取
  if (sectionLinks.length === 0) {
    const globalPattern = /href="(https?:\/\/[^"']+\.apk[^"']*)"[^>]*>/gi;
    const matches = [];
    let m;
    const tmp = new RegExp(globalPattern.source, 'gi');
    while ((m = tmp.exec(html)) !== null) {
      const url = m[1].split('?')[0];
      if (!matches.includes(url)) matches.push(url);
    }
    return matches;
  }
  return sectionLinks;
}

// ─── Puppeteer 拦截爬取 ──────────────────────────────────────────

/** 通用 Puppeteer 拦截爬取 */
async function puppeteerIntercept(url, options = {}) {
  const {
    waitUntil = 'networkidle2',
    waitMs = 5000,
    clickSelector = null,
    hoverSelector = null,
    apkFilter = () => true,
  } = options;

  const browser = await puppeteer.launch({ args: BROWSER_ARGS, headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');

  const apkRequests = [];
  page.on('request', req => {
    const u = req.url();
    if (/\.apk/i.test(u) && apkFilter(u)) apkRequests.push(u);
  });

  try {
    await page.goto(url, { waitUntil, timeout: 20000 });
    await new Promise(r => setTimeout(r, waitMs));

    if (clickSelector) {
      await page.click(clickSelector).catch(() => {});
      await new Promise(r => setTimeout(r, 2000));
    }
    if (hoverSelector) {
      await page.hover(hoverSelector).catch(() => {});
      await new Promise(r => setTimeout(r, 3000));
    }
  } catch (e) {
    // 忽略超时，继续
  }

  await browser.close();
  return apkRequests;
}

// ─── 各软件专用爬取 ──────────────────────────────────────────────

async function crawlBySoftware(name, type, excelUrl, description) {
  const key = name.replace(/\s+/g, '') + '|' + type;

  // ① 直接 HTTP → HTML 解析
  // 吉利版/公签版与普通版共用页面，跳过；嘟嘟/乐酷/哔哩/QQ音乐/智车/布丁有专用逻辑，跳过
  const skipHtmlParse = name.includes('氢桌面吉利版') || name.includes('氢桌面公签版')
    || name.includes('嘟嘟桌面') || name.includes('哔哩') || name.includes('乐酷桌面')
    || name.includes('QQ ') || name.includes('智车') || name.includes('布丁');
  let preFetchedHtml = null;
  if (!skipHtmlParse) {
    try {
      const { status } = await checkUrl(excelUrl);
      console.log(`  HTTP ${status} → ${excelUrl}`);
      if (status >= 200 && status < 400) {
        try {
          preFetchedHtml = await httpGetHtml(excelUrl);
        } catch (e) {
          console.log(`  HTML解析失败: ${e.message}`);
        }
      }
    } catch (e) {
      console.log(`    HTTP失败: ${e.message}`);
    }
    // 通用 HTML 解析（不适合嘟嘟桌面，用 section-aware 版本）
    if (preFetchedHtml) {
      const apkLinks = extractApkLinks(preFetchedHtml, excelUrl);
      if (apkLinks.length > 0) {
        const first = apkLinks[0];
        const { status: apkStatus } = await checkUrl(first);
        if (apkStatus >= 200 && apkStatus < 400) {
          return { url: first, method: 'html-parse', allFound: apkLinks };
        }
      }
    }
  }

  // ② 根据软件名走专用爬取
  try {
    let result = null;

    if (name.includes('高德') && type === '车机版') {
      result = await crawlAmapAuto();
    } else if (name.includes('高德') && type === '手机版') {
      result = await crawlAmapMobile();
    } else if (name.includes('百度') && type === '手机版') {
      result = await crawlBaiduMobile(excelUrl);
    } else if (name.includes('百度') && type === '车机版') {
      // 百度地图车机版：官方下载页 carmap.baidu.com 无 APK 直链，直接用 MANUAL
      console.log('    [专用] 百度地图车机版 → 无HTML解析，用MANUAL');
      result = { url: null, method: 'none' };
    } else if (name.includes('腾讯')) {
      result = await crawlTencentMap(excelUrl);
    } else if (name.includes('网易') || name.includes('云音乐')) {
      result = await crawlNetEaseMusic(excelUrl);
    } else if (name.includes('酷我')) {
      if (name.includes('极简')) {
        result = await crawlKuwoMusic(excelUrl, 'lite');
      } else {
        // 公版：kuwo.cn 点击按钮后仍只返回 lite APK，直接用 MANUAL
        result = { url: null, method: 'none' };
      }
    } else if (name.includes('智车')) {
      result = await crawlZhiChe(excelUrl, name);
      // 如果专用失败，仍尝试 MANUAL（不提前返回）
    } else if (name.includes('喜马拉雅')) {
      result = await crawlXimalaya(excelUrl);
    } else if (name.includes('嘟嘟')) {
      result = await crawlDuDu(excelUrl, name, preFetchedHtml);
    } else if (name.includes('氢桌面')) {
      result = await crawlQingDesktop(excelUrl, name);
    } else if (name.includes('乐酷')) {
      result = await crawlLecoDesktop(excelUrl, name);
    } else if (name.includes('布丁')) {
      result = await crawlBudingUI(excelUrl, name);
    } else if (name.includes('QQ ')) {
      result = await crawlQQMusic(excelUrl);
    } else if (name.includes('哔哩')) {
      result = await crawlBilibili(excelUrl);
    }

    if (result && result.url) return result;
  } catch (e) {
    console.log(`    专用爬取失败: ${e.message}`);
  }

  // ③ MANUAL Fallback
  const manualUrl = MANUAL[key];
  if (manualUrl) {
    // 跳过 checkUrl 验证（CDN可能有UA/Referer限制导致HEAD失败），直接尝试GET
    try {
      const result = await checkUrl(manualUrl);
      if (result.status >= 200 && result.status < 400) {
        return { url: manualUrl, method: 'manual', allFound: [manualUrl] };
      }
      // 尝试 GET 方式验证（部分CDN对HEAD响应异常）
      try {
        await httpGetHtml(manualUrl);
        return { url: manualUrl, method: 'manual', allFound: [manualUrl] };
      } catch {}
    } catch {}
  }

  return { url: null, method: 'none', note: '所有方式均失败' };
}

// ─── 各软件专用函数 ──────────────────────────────────────────────

async function crawlAmapAuto() {
  console.log('    [专用] 高德地图车机版 → auto.amap.com/download (静态HTML)');
  // auto.amap.com/download 是静态页面，直接 HTTP 解析
  const html = await httpGetHtml('https://auto.amap.com/download');
  const apkLinks = extractApkLinks(html, 'https://auto.amap.com/download');
  if (apkLinks.length > 0) {
    return { url: apkLinks[0], method: 'html-parse', allFound: apkLinks };
  }
  return { url: null, method: 'none' };
}

async function crawlAmapMobile() {
  console.log('    [专用] 高德地图手机版 → wap.amap.com（JS渲染，无法直接抓，需扫码）');
  // 高德手机版下载页是 JS 渲染，且显示二维码，无法自动抓取
  // 这种情况走 MANUAL Fallback
  return { url: null, method: 'none', note: 'wap.amap.com 为JS渲染+二维码，需人工' };
}

async function crawlBaiduMobile(excelUrl) {
  console.log('    [专用] 百度地图手机版');
  // 百度地图手机版 URL 通常会 302 重定向到另一个下载页
  const urls = await puppeteerIntercept(excelUrl, {
    waitUntil: 'networkidle2', waitMs: 4000,
    apkFilter: u => /\.apk/i.test(u) && u.includes('baidu'),
  });
  if (urls.length > 0) return { url: urls[0], method: 'puppeteer-intercept', allFound: urls };
  return { url: null, method: 'none' };
}

async function crawlTencentMap(excelUrl) {
  console.log('    [专用] 腾讯地图车机版');
  const urls = await puppeteerIntercept(excelUrl, {
    waitUntil: 'networkidle2', waitMs: 4000,
    apkFilter: u => /\.apk/i.test(u) && (u.includes('qq.com') || u.includes('myqcloud')),
  });
  if (urls.length > 0) return { url: urls[0], method: 'puppeteer-intercept', allFound: urls };
  return { url: null, method: 'none' };
}

async function crawlNetEaseMusic(excelUrl) {
  console.log('    [专用] 网易云音乐车机版');
  const urls = await puppeteerIntercept('https://music.163.com/#/download', {
    waitUntil: 'domcontentloaded', waitMs: 8000,
    apkFilter: u => /\.apk/i.test(u) && u.includes('126.net'),
  });
  if (urls.length > 0) return { url: urls[0], method: 'puppeteer-intercept', allFound: urls };
  return { url: null, method: 'none' };
}

async function crawlKuwoMusic(excelUrl, variant = 'full') {
  console.log(`    [专用] 酷我音乐 → variant=${variant}，点击"${variant === 'lite' ? '极简版' : '公版'}"按钮`);
  const browser = await puppeteer.launch({ args: BROWSER_ARGS, headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');

  const apkRequests = [];
  page.on('request', req => {
    const u = req.url();
    if (u.includes('mobilebasedata.kuwo.cn') && u.includes('file=')) apkRequests.push(u);
  });

  await page.goto('https://www.kuwo.cn/down', { waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 3000));

  // 点击对应版本标签
  const targetText = variant === 'lite' ? '极简版' : '公版';
  await page.evaluate((text) => {
    const els = document.querySelectorAll('*');
    for (const el of els) {
      if (el.childNodes.length === 1 && el.innerText.trim() === text) {
        el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        return;
      }
    }
  }, targetText);
  await new Promise(r => setTimeout(r, 3000));
  await browser.close();

  if (apkRequests.length > 0) {
    try {
      const parsed = new URL(apkRequests[0]);
      const fileParam = parsed.searchParams.get('file');
      if (fileParam) return { url: fileParam, method: 'puppeteer-intercept', allFound: apkRequests };
    } catch {}
    return { url: apkRequests[0], method: 'puppeteer-intercept', allFound: apkRequests };
  }
  return { url: null, method: 'none' };
}

async function crawlKuGouMusic(excelUrl) {
  console.log('    [专用] 酷狗音乐车机版');
  // 先尝试 HTTP 解析
  try {
    const html = await httpGetHtml(excelUrl);
    const apkLinks = extractApkLinks(html, excelUrl);
    if (apkLinks.length > 0) return { url: apkLinks[0], method: 'html-parse', allFound: apkLinks };
  } catch {}
  const urls = await puppeteerIntercept(excelUrl, {
    waitUntil: 'networkidle2', waitMs: 5000,
    apkFilter: u => /\.apk/i.test(u) && u.includes('kugou'),
  });
  if (urls.length > 0) return { url: urls[0], method: 'puppeteer-intercept', allFound: urls };
  return { url: null, method: 'none' };
}

async function crawlQiShuiMusic(excelUrl) {
  console.log('    [专用] 汽水音乐');
  const urls = await puppeteerIntercept('https://music.douyin.com/qishui', {
    waitMs: 5000,
    hoverSelector: '.download-button.android',
    apkFilter: u => /\.apk/i.test(u) && u.includes('douyin'),
  });
  if (urls.length > 0) return { url: urls[0], method: 'puppeteer-intercept', allFound: urls };
  return { url: null, method: 'none' };
}

async function crawlXimalaya(excelUrl) {
  console.log('    [专用] 喜马拉雅车机版');
  const urls = await puppeteerIntercept('https://car.ximalaya.com/#/', {
    waitUntil: 'networkidle2', waitMs: 5000,
    apkFilter: u => /\.apk/i.test(u) && u.includes('ximalaya'),
  });
  if (urls.length > 0) return { url: urls[0], method: 'puppeteer-intercept', allFound: urls };
  return { url: null, method: 'none' };
}

async function crawlDuDu(excelUrl, name = '', preFetchedHtml = null) {
  console.log(`    [专用] 嘟嘟桌面 → ${name}`);
  const html = preFetchedHtml || await httpGetHtml(excelUrl);
  const sections = extractApkLinksBySection(html, excelUrl);

  // 嘟嘟桌面有4个区块：PRO专享版、公版、pro公签版、其他软件
  // Excel里3个条目：PRO公版、PRO MINI版、PRO公签版
  // 公版区块里：普通公版 + MINI
  // PRO公签版区块里：PRO公签APK
  const gbSection = sections.find(s => s.sectionId === '公版');
  const gqsSection = sections.find(s => s.sectionId === 'pro公签版');
  const proSection = sections.find(s => s.sectionId === 'pro专享版');

  // 找对应 APK
  let targetApk = null;
  const n = name.replace(/\s+/g, '');

  if (n.includes('公签')) {
    // PRO公签版 → pro公签版区块
    if (gqsSection && gqsSection.apkLinks.length > 0) {
      targetApk = gqsSection.apkLinks[0].url;
    }
  } else if (n.includes('MINI') || n.includes('mini')) {
    // PRO MINI版 → 公版区块里的MINI
    if (gbSection) {
      const mini = gbSection.apkLinks.find(a => a.text.includes('MINI'));
      targetApk = mini ? mini.url : (gbSection.apkLinks.length > 1 ? gbSection.apkLinks[1].url : gbSection.apkLinks[0].url);
    }
  } else {
    // PRO公版 → 公版区块（跳过PRO专享版的比亚迪专享版）
    if (gbSection && gbSection.apkLinks.length > 0) {
      targetApk = gbSection.apkLinks[0].url;
    }
  }

  // 收集所有 APK
  const allFound = sections.flatMap(s => s.apkLinks.map(a => a.url));

  if (targetApk) {
    return { url: targetApk, method: 'html-parse-section', allFound };
  }
  return { url: null, method: 'none', allFound };
}

async function crawlQingDesktop(excelUrl, name = '') {
  console.log(`    [专用] 氢桌面 → ${name}`);
  // 吉利版、公签版需要点击按钮，无法自动获取，走 MANUAL Fallback
  if (name.includes('吉利') || name.includes('公签')) {
    return null;
  }
  const urls = await puppeteerIntercept(excelUrl, {
    waitUntil: 'networkidle2', waitMs: 5000,
    apkFilter: u => /\.apk/i.test(u),
  });
  if (urls.length > 0) return { url: urls[0], method: 'puppeteer-intercept', allFound: urls };
  return { url: null, method: 'none' };
}

async function crawlLecoDesktop(excelUrl, name = '') {
  console.log(`    [专用] 乐酷桌面 → ${name}`);
  try {
    const html = await httpGetHtml(excelUrl);
    const apkLinks = extractApkLinks(html, excelUrl);
    if (apkLinks.length > 0) {
      // 根据 name 选择正确版本（URL编码中文需解码后比较）
      let target = apkLinks[0]; // 默认第一个（普通版）
      if (name.includes('公签') || name.includes('公签版')) {
        // 优先匹配 "公签_sign.apk"，排除 "公签兼容"
        const gq = apkLinks.find(u => decodeURIComponent(u).includes('公签_sign.apk'));
        if (gq) target = gq;
      } else if (name.includes('普通') || name.includes('普通版')) {
        const pt = apkLinks.find(u => decodeURIComponent(u).includes('_普通_sign.apk'));
        if (pt) target = pt;
      }
      return { url: target, method: 'html-parse', allFound: apkLinks };
    }
  } catch (e) {
    console.log(`    乐酷 HTTP 失败: ${e.message}`);
  }
  return { url: null, method: 'none' };
}

async function crawlBudingUI(excelUrl, name = '') {
  console.log('    [专用] 布丁UI →', name);
  try {
    const html = await httpGetHtml(excelUrl);
    // 提取所有 APK/API 链接
    const allLinks = [];
    const apkPat = /href="(https?:\/\/(?:api\.budingui\.com|assets\.autoshafa\.com)[^"]+)"/gi;
    let m;
    while ((m = apkPat.exec(html)) !== null) {
      const url = m[1].replace(/&amp;/g, '&');
      if (!allLinks.includes(url)) allLinks.push(url);
    }

    if (name.includes('普通版') || name.includes('AOSP') || name.includes('公版')) {
      // 优先使用 API 链接（普通版/AOSP）
      const apiLink = allLinks.find(u => u.includes('api.budingui.com'));
      if (apiLink) {
        try {
          const { status } = await checkUrl(apiLink);
          if (status >= 200 && status < 400) {
            return { url: apiLink, method: 'html-parse', allFound: allLinks };
          }
        } catch {}
        return { url: apiLink, method: 'html-parse', allFound: allLinks };
      }
    } else if (name.includes('低版本') || name.includes('4.x') || name.includes('x86')) {
      // 低版本安卓系统：找 x86 版本的直链
      const x86Link = allLinks.find(u => u.includes('x86') || u.includes('v2.1.7'));
      if (x86Link) return { url: x86Link, method: 'html-parse', allFound: allLinks };
      // fallback 第一个 CDN 链接
      const cdnLink = allLinks.find(u => u.includes('assets.autoshafa.com'));
      if (cdnLink) return { url: cdnLink, method: 'html-parse', allFound: allLinks };
    }
    // 默认返回第一个链接
    if (allLinks.length > 0) return { url: allLinks[0], method: 'html-parse', allFound: allLinks };
  } catch (e) {
    console.log('    布丁UI HTTP 失败:', e.message);
  }
  const urls = await puppeteerIntercept(excelUrl, {
    waitUntil: 'networkidle2', waitMs: 4000,
    apkFilter: u => /\.apk/i.test(u) && u.includes('buding'),
  });
  if (urls.length > 0) return { url: urls[0], method: 'puppeteer-intercept', allFound: urls };
  return { url: null, method: 'none' };
}

async function crawlZhiChe(excelUrl, name = '') {
  console.log('    [专用] 智车桌面 →', name);
  try {
    // 先获取所有可用渠道列表
    const listUrl = 'https://api.yxyyds.cn/system/appVersion/getAvailableChannels?platform=android';
    const listHtml = await httpGetHtml(listUrl);
    let listJson;
    try {
      listJson = JSON.parse(listHtml);
    } catch {
      return { url: null, method: 'none', note: '智车渠道API解析失败' };
    }

    const channels = (listJson.data || listJson.result || []);
    if (!Array.isArray(channels) || channels.length === 0) {
      // fallback：尝试直接抓 getLatestRelease
      const fallbackHtml = await httpGetHtml('https://api.yxyyds.cn/system/appVersion/getLatestRelease?platform=android&channelType=platform');
      try {
        const fallback = JSON.parse(fallbackHtml);
        if (fallback.data && fallback.data.realDownloadUrl) {
          return { url: fallback.data.realDownloadUrl, method: 'html-parse', allFound: [fallback.data.realDownloadUrl] };
        }
      } catch {}
      return { url: null, method: 'none', note: '智车渠道列表为空' };
    }

    // 根据 name 匹配合适的渠道
    // "公签版" / "AOSP" / "公版" → platform 渠道
    // "普通版" → normal 渠道
    let targetChannelType = null;
    if (name.includes('公签') || name.includes('AOSP') || name.includes('公版')) {
      targetChannelType = 'platform';
    } else if (name.includes('普通版')) {
      targetChannelType = 'normal';
    }

    let targetChannel = targetChannelType
      ? channels.find(c => c.channelType === targetChannelType)
      : channels.find(c => c.channelType === 'platform') || channels[0];

    if (!targetChannel) targetChannel = channels[0];

    // 通过 channelType 获取最新版本下载链接
    const releaseUrl = `https://api.yxyyds.cn/system/appVersion/getLatestRelease?platform=android&channelType=${targetChannel.channelType}`;
    const releaseHtml = await httpGetHtml(releaseUrl);
    let releaseJson;
    try {
      releaseJson = JSON.parse(releaseHtml);
    } catch {
      return { url: null, method: 'none', note: '智车版本API解析失败' };
    }

    const downloadUrl = releaseJson.data && releaseJson.data.realDownloadUrl;
    if (!downloadUrl) return { url: null, method: 'none', note: '智车API无下载链接' };

    return {
      url: downloadUrl,
      method: 'html-parse',
      allFound: channels.map(c => `https://api.yxyyds.cn/system/appVersion/getLatestRelease?platform=android&channelType=${c.channelType}`),
      note: `${targetChannel.channelType} v${releaseJson.data.version || ''}`,
    };
  } catch (e) {
    console.log('    智车 API 失败:', e.message);
  }
  return { url: null, method: 'none', note: '智车下载失败' };
}

async function crawlQQMusic(excelUrl) {
  console.log('    [专用] QQ音乐车机版 → 走MANUAL（QQ音乐下载页为JS渲染，无法自动抓取车机版APK）');
  // QQ音乐车机版需人工确认下载页，专用爬取返回null走MANUAL
  return { url: null, method: 'none', note: 'QQ音乐下载页JS渲染，用MANUAL' };
}

async function crawlBilibili(excelUrl) {
  console.log('    [专用] 哔哩哔哩车机版（优先bilithings车机版，其次TV版）');
  // 先尝试 HTTP 解析车机版 bilithings
  try {
    const html = await httpGetHtml(excelUrl);
    const apkLinks = extractApkLinks(html, excelUrl);
    // 找 bilithings（车机版），排除 android_tv（TV版）
    const carApk = apkLinks.find(u => u.includes('bilithings'));
    if (carApk) return { url: carApk, method: 'html-parse', allFound: apkLinks };
    // fallback TV版
    const tvApk = apkLinks.find(u => u.includes('android_tv'));
    if (tvApk) return { url: tvApk, method: 'html-parse', allFound: apkLinks };
  } catch (e) {
    console.log(`    哔哩 HTTP 失败: ${e.message}`);
  }
  return { url: null, method: 'none', note: 'B站下载页无法解析' };
}

// ─── 主程序 ─────────────────────────────────────────────────────

async function main() {
  // 读取 Excel
  const excelPath = 'D:/OneDrive/自学编程/claude code/work3/车机软件汇总.xlsx';
  const wb = XLSX.readFile(excelPath);
  const ws = wb.Sheets['Sheet1'];
  const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', range: 2 });

  const COL_NAME = 0, COL_TYPE = 1, COL_URL = 2, COL_DESC = 3, COL_SOURCE = 4, COL_CAT = 5;

  const results = [];
  let ok = 0, fail = 0;

  console.log(`\n=== 动态爬取车机软件 APK ===  共 ${rawRows.filter(r => r[COL_NAME] && r[COL_NAME] !== '软件名称').length} 条\n`);

  for (const row of rawRows) {
    const name = String(row[COL_NAME] || '').trim();
    if (!name || name === '软件名称') continue;

    const type = String(row[COL_TYPE] || '').trim();
    const excelUrl = String(row[COL_URL] || '').trim();
    const desc = String(row[COL_DESC] || '').trim();
    const src = String(row[COL_SOURCE] || '').trim();
    const cat = String(row[COL_CAT] || '').trim();

    console.log(`\n▶ ${name} [${type}]`);
    console.log(`  官方: ${excelUrl}`);
    console.log(`  提示: ${desc}`);

    let finalUrl = null, method = 'none', allFound = [], note = null;

    // ① 先验证 Excel 官方 URL 是否直接可用
    // 吉利/公签版与普通版共用页面，跳过；嘟嘟/乐酷各区块APK不同，跳过
    const skipMainStep1 = name.includes('氢桌面吉利版') || name.includes('氢桌面公签版')
      || name.includes('嘟嘟桌面') || name.includes('乐酷桌面') || name.includes('哔哩')
      || name.includes('智车') || name.includes('布丁') || name.includes('QQ ');
    if (!skipMainStep1 && excelUrl) {
      try {
        const { status, url: finalRedir } = await checkUrl(excelUrl);
        console.log(`  HTTP ${status} → ${excelUrl}`);
        if (status >= 200 && status < 400) {
          // 直接可用，尝试解析 HTML 中的 APK 链接
          try {
            const html = await httpGetHtml(excelUrl);
            const apkLinks = extractApkLinks(html, excelUrl);
            if (apkLinks.length > 0) {
              // 验证 APK 是否真实可下载
              const apkStatus = await checkUrl(apkLinks[0]);
              if (apkStatus.status === 200) {
                finalUrl = apkLinks[0];
                method = 'html-parse';
                allFound = apkLinks;
                console.log(`  ✅ HTML解析: ${finalUrl}`);
              }
            }
          } catch (e) {
            console.log(`  HTML解析失败: ${e.message}`);
          }
        }
      } catch (e) {
        console.log(`  HTTP失败: ${e.message}`);
      }
    }

    // ② 走专用爬取（HTML 解析没找到 APK 时）
    if (!finalUrl) {
      const result = await crawlBySoftware(name, type, excelUrl, desc);
      if (result && result.url) {
        finalUrl = result.url;
        method = result.method;
        allFound = result.allFound || [];
        note = result.note;
        console.log(`  ✅ [${method}] ${finalUrl}`);
      } else {
        note = (result && result.note) || '爬取失败';
        console.log(`  ❌ ${note}`);
      }
    }

    if (finalUrl) ok++; else fail++;

    results.push({
      name, type, category: cat,
      source: src || '官方',
      description: desc,
      url: finalUrl || null,
      excelUrl,
      method,
      status: finalUrl ? 'ok' : 'fail',
      note,
      allFound: allFound.filter(u => u !== finalUrl),
    });

    // 限速
    await new Promise(r => setTimeout(r, 1000));
  }

  // ─── 输出到 output.json ────────────────────────────────────────
  const output = {
    total: results.length,
    success: ok,
    failed: fail,
    generatedAt: new Date().toISOString(),
    note: '动态爬取生成 - 优先解析官方下载页HTML，失败则Puppeteer拦截APK请求，最终Fallback到MANUAL表',
    results,
  };

  const outPath = 'D:/OneDrive/自学编程/claude code/work3/output.json';
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`\n\n=== 完成 ===`);
  console.log(`  成功: ${ok}/${results.length}`);
  console.log(`  失败: ${fail}`);
  console.log(`\n输出: ${outPath}`);

  const fails = results.filter(r => r.status !== 'ok');
  if (fails.length > 0) {
    console.log(`\n⚠️  未爬到 (${fails.length} 条):`);
    fails.forEach(r => console.log(`  ❌ ${r.name} [${r.type}]: ${r.note}`));
  }

  // 统计各 method 数量
  const methodCount = {};
  results.forEach(r => { methodCount[r.method] = (methodCount[r.method] || 0) + 1; });
  console.log(`\n📊 Method 统计:`);
  Object.entries(methodCount).forEach(([m, c]) => console.log(`  ${m}: ${c}`));
}

main().catch(e => { console.error(e); process.exit(1); });
