/**
 * 重建 output.json
 *
 * 数据源：
 * 1. Excel（Sheet1）：软件名称 / 类型 / 官方下载地址 / 描述 / 来源 / 分类
 * 2. MANUAL 完整 URL 表（键 = name去空格 + '|' + type）
 */
'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const fs   = require('fs');
const XLSX = require('xlsx');

// ── Excel ──────────────────────────────────────────────────────────────────
const excelPath = process.env.SOFTWARE_DATA_PATH
  || path.join(__dirname, '..', '车机软件汇总.xlsx');

const wb = XLSX.readFile(excelPath);
const ws = wb.Sheets['Sheet1'];
const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', range: 2 });

const COL_NAME   = 0;  // 软件名称
const COL_TYPE   = 1;  // 类型
const COL_URL    = 2;  // 官方下载地址
const COL_DESC   = 3;  // 描述
const COL_SOURCE = 4;  // 来源
const COL_CAT    = 5;  // 分类

/**
 * 完整 URL 修正表
 * 键 = name去除空格 + '|' + type
 *
 * 处理策略：
 * - 氢桌面三个版本 → 官网下线，CDN 上各自文件均存在，手动指定
 * - 乐酷桌面两版本 → allFoundUrls 两个版本 URL 均正常，手动区分\n * - 高德/百度 → 去空格+type 区分车机版/手机版\n * - 酷我音乐 → CDN 403（触发迅雷），保留 URL 供手动处理\n * - 哔哩哔哩 → 无车机专用版，用 android_tv 版\n * - 其他 → 优先使用 allFoundUrls[0]，或 fallback 到 Excel 原始地址
 */
const MANUAL = {
  // 嘟嘟桌面PRO（三个子版本 allFoundUrls 第一条均相同，用最新时间戳版本）
  '嘟嘟桌面PRO公版|车机版': 'https://file-qiniu2.dudu-lucky.com/filemanage/202512021119597def46440dff4cde91a3424dbfe91e1e.apk',
  '嘟嘟桌面PROMINI版|车机版': 'https://file-qiniu2.dudu-lucky.com/filemanage/202512021119597def46440dff4cde91a3424dbfe91e1e.apk',
  '嘟嘟桌面PRO公签版|车机版': 'https://file-qiniu2.dudu-lucky.com/filemanage/202512021119597def46440dff4cde91a3424dbfe91e1e.apk',

  // 布丁UI（allFoundUrls 仅一个 APK，两个版本共用；低版本4.x APK 与正式版相同）
  '布丁UI普通版|车机版': 'https://assets.autoshafa.com/apk/buding_bece53692609e838da3cd8e2d5cd9999_1.0.2.v4_V4webwww.apk',
  '布丁UI低版本安卓系统|车机版': 'https://assets.autoshafa.com/apk/buding_bece53692609e838da3cd8e2d5cd9999_1.0.2.v4_V4webwww.apk',

  // 氢桌面（官网下线，CDN 文件三个版本均存在）
  '氢桌面普通版|车机版': 'https://vv.hyjidi.com/app/122/%E6%99%AE%E9%80%9A%E7%89%881.apk',
  '氢桌面吉利版|车机版': 'https://vv.hyjidi.com/app/122/%E5%90%89%E5%88%A9%E8%BD%A6%E5%9E%8B%E4%B8%93%E7%94%A81.apk',
  '氢桌面公签版|车机版': 'https://vv.hyjidi.com/app/122/%E5%90%AF%E8%BE%B0%E4%BC%97%E7%AD%BE%E7%89%881.apk',

  // 乐酷桌面（allFoundUrls 两个版本 URL 均正常）
  '乐酷桌面普通版|车机版': 'https://leco-1252637813.cos.ap-nanjing.myqcloud.com/update/%E4%B9%90%E9%85%B7%E6%A1%8C%E9%9D%A2_1.8.4.7_%E6%99%AE%E9%80%9A_sign.apk',
  '乐酷桌面公签版|车机版': 'https://leco-1252637813.cos.ap-nanjing.myqcloud.com/update/%E4%B9%90%E9%85%B7%E6%A1%8C%E9%9D%A2_1.8.4.7_%E5%85%AC%E7%AD%BE_sign.apk',

  // 智车桌面（CDN 签名 URL，带过期参数）
  '智车桌面公签版|车机版': 'https://m407.lanosso.com:446/04171300280224704bb/2026/03/28/9465345b684c93d7e3330ccc9b0192d5.apk',
  '智车桌面普通版|车机版': 'https://m908.lanosso.com:446/04171300280222179bb/2026/03/28/f4383037b964e4279eb144629026b09f.apk',

  // 导航地图（按 type 区分车机版/手机版）
  '高德地图|车机版':  'https://mapdownload.autonavi.com/apps/auto/manual/V910/Auto_9.1.0.600087_release_signed.apk?u=f901b59b1b0fc7f25b3707168667611b&',
  '高德地图|手机版':  'https://download.autonavi.com/amap/package/C02110001348/Amap_V16.12.0.2027_android_C02110001348_(Build260323142446iSEB5dJI-64).apk',
  '百度地图|车机版':  'https://downapp.baidu.com/original_new/322/1/1/1775832266877/BaiduMapForAuto.apk',
  '百度地图|手机版':  'https://downpack.baidu.com/baidumap_AndroidPhone_1009176a.apk',
  '腾讯地图|车机版':  'https://smart-navi-1258344699.cos.ap-guangzhou.myqcloud.com/ua/apk/TencentMapAuto_default_9.5.0.50_release_20260210161357.apk',

  // 影音娱乐
  '网易云音乐|车机版': 'https://d3.music.126.net/f4ceaa5f-ca58-4384-be40-9087f2c02c65.apk',
  'QQ音乐|车机版':     'https://dldir1.qq.com/music/qqmusiccar/10049404-qqmusiccar-3.10.0.6-80dc5dd2bd_commonMv_full-release-signed.apk',
  '酷我音乐|车机版':   'https://pkgdown.kuwo.cn/mbox/kwplayercar_ar_APK_guanwang.apk',   // CDN 403
  '酷我音乐极简版|车机版': 'https://pkgdown.kuwo.cn/mbox/kwplayerautolite_C_APK_guanwang_lite.apk', // CDN 403
  '酷狗音乐|车机版':   'https://applabsbssdlbig.kugou.com/202604171425/c8ced6803ce0bf2b843e5523448a7fcb/KugouAuto_v6.1.0_8069_685153ce.apk',
  '汽水音乐|手机版':   'https://lf9-apk.ugapk.cn/package/apk/luna/8986_100189030/luna_43074760a_v8986_100189030_46cc_1775590296.apk?v=1775590302',
  '喜马拉雅|车机版':   'https://apk.pcdn.xmcdn.com/storages/445c-audiofreehighqps/23/BA/GAqhntANMAkfAro9NQRS9RuR.apk',
  '哔哩哔哩|车机版':   'https://dl.hdslb.com/mobile/latest/android_tv_yst/iBiliTV-master.apk', // 无车机专用版，用TV版
};

// ── 重建 ───────────────────────────────────────────────────────────────────
const results = [];
let ok = 0, fail = 0;

for (const row of rawRows) {
  const name = String(row[COL_NAME] || '').trim();
  if (!name || name === '软件名称') continue;

  const type   = String(row[COL_TYPE]   || '').trim();
  const desc   = String(row[COL_DESC]  || '').trim();
  const src    = String(row[COL_SOURCE]|| '').trim();
  const cat    = String(row[COL_CAT]   || '').trim();
  // 去空格后与 type 拼接为完整键
  const norm   = name.replace(/\s+/g, '');
  const key    = norm + '|' + (type || '');

  const finalUrl = MANUAL[key] || null;
  const method = finalUrl ? '手动URL' : '无有效URL';

  if (finalUrl) ok++; else fail++;

  results.push({
    name,
    type,
    category: cat,
    source: src || '官方',
    description: desc,
    method,
    status: finalUrl ? 'ok' : 'fail',
    url: finalUrl || null,
  });
}

// ── 输出 ───────────────────────────────────────────────────────────────────
const output = {
  total: results.length,
  success: ok,
  failed: fail,
  generatedAt: new Date().toISOString(),
  note: '重建脚本 v2 - 使用 name|type 作为唯一键',
  results,
};

const outPath = path.join(__dirname, '..', 'output.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');

console.log(`✅ output.json 重建完成`);
console.log(`   总计: ${results.length} | 成功: ${ok} | 失败: ${fail}`);
console.log(`\n📋 全部记录:`);
results.forEach(r => {
  const mark = r.url ? '✅' : '❌';
  console.log(`  ${mark} [${r.method}] ${r.name} [${r.type}] → ${r.url?.substring(0,65)}`);
});
if (fail > 0) {
  const failNames = results.filter(r => !r.url).map(r => `${r.name}[${r.type}]`);
  console.log(`\n⚠️  待手动处理 (${fail} 条):`, failNames.join(', '));
}
