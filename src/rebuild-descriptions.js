/**
 * rebuild-output.js
 * 根据软件名称硬编码描述，生成新的 output.json
 *
 * 用法: node src/rebuild-output.js
 */

'use strict';
const fs = require('fs');
const path = require('path');

// ─── 软件描述映射表 (硬编码) ───────────────────────────────────────
const DESCRIPTIONS = {
  // ===== 车机桌面 =====
  '嘟嘟桌面 PRO 公版': '嘟嘟桌面PRO公版是一款专为安卓车机打造的桌面启动器，支持多种主题自定义、快捷功能设置和悬浮窗小工具，提供流畅的车载交互体验。',
  '嘟嘟桌面 PRO MINI版': '嘟嘟桌面PRO MINI版是PRO版本的精简适配版，专门针对低配置车机优化，占用资源少，运行流畅，适合老旧车机或低内存设备使用。',
  '嘟嘟桌面 PRO 公签版': '嘟嘟桌面PRO公签版使用公共Android签名，可适配更多品牌车机，支持画中画模式和多种手势操作，是兼容性更好的PRO版本选择。',
  '氢桌面普通版': '氢桌面是一款轻量级安卓车机桌面，主打简洁快速，支持主题更换、快捷方式设置和桌面快捷APP入口，适配市面上大多数安卓车机。',
  '氢桌面吉利版': '氢桌面吉利版是专为吉利汽车定制的车机桌面版本，针对吉利车机系统深度优化，完美匹配原车屏幕分辨率和触控体验。',
  '氢桌面公签版': '氢桌面公签版采用公共Android签名，兼容性更强，支持画中画功能，可同时显示导航和其他应用，适合多种品牌车机安装使用。',
  '乐酷桌面普通版': '乐酷桌面是一款功能丰富的安卓车机桌面，支持悬浮地图、分屏操作、主题DIY和多种快捷手势，为车载环境提供便捷的人机交互界面。',
  '乐酷桌面公签版': '乐酷桌面公签版使用公共签名，适配使用方易通、梁山车机、车连易盒子、领克E系列、吉利E系列等车机，支持画中画功能。',
  '布丁UI普通版': '布丁UI是一款界面美观简洁的安卓车机桌面，采用现代化设计语言，支持多种主题皮肤和快捷操作，提供流畅的车载桌面体验。',
  '布丁UI低版本安卓系统': '布丁UI低版本安卓系统版专门适配Android 4.x等低版本车机系统的车机桌面，让老旧设备也能享受布丁UI的简洁界面。',
  '智车桌面公签版': '智车桌面公签版采用AOSP公共签名，适配更多品牌车机设备，功能与普通版一致，支持多种车机平台和车型。',
  '智车桌面普通版': '智车桌面是一款适配多种车型的安卓车机桌面，支持主题切换、快捷方式、应用管理和桌面布局自定义等功能。',

  // ===== 导航地图 =====
  '高德地图': '高德地图是国内领先的数字地图内容、导航和位置服务解决方案提供商，提供精准的实时路况、导航规划、驾车路线等服务。',
  '百度地图': '百度地图是百度推出的智能导航应用，提供精准的地图数据、实时路况、路线规划和语音导航，支持多种出行方式。',
  '腾讯地图': '腾讯地图是腾讯推出的地图导航服务，整合微信位置能力，提供实时路况、智能路线规划和便捷的出行导航体验。',

  // ===== 影音娱乐 =====
  '网易云音乐': '网易云音乐是国内知名的音乐平台，支持在线音乐播放、歌单管理、个性化推荐，车机版专为驾驶场景优化，提供安全的音乐体验。',
  'QQ音乐': 'QQ音乐是腾讯推出的音乐播放平台，拥有丰富的音乐版权库和个性化推荐，车机版支持横竖屏切换和沉浸座舱音效。',
  '酷我音乐': '酷我音乐是一款集播放、下载、mv于一体的音乐软件，车载版针对车机场景优化界面触控，提供高品质音乐播放体验。',
  '酷我音乐极简版': '酷我音乐极简版是酷我音乐的车机精简版本，界面简洁资源占用少，适合低配置车机使用，主打快速启动和稳定播放。',
  '酷狗音乐': '酷狗音乐是国内老牌音乐播放器，拥有海量音乐资源，车载版针对车机屏幕和操控方式优化，提供便捷的车载音乐体验。',
  '汽水音乐': '汽水音乐是抖音推出的音乐播放应用，主打年轻化音乐社区氛围和个性化推荐，手机版支持便捷的账号同步和每日推荐。',
  '喜马拉雅': '喜马拉雅是国内知名的音频分享平台，提供海量有声书、相声、播客等内容，车机版让用户在驾驶时也能畅听丰富的音频节目。',
  '哔哩哔哩': '哔哩哔哩是国内知名的视频弹幕网站，车机版针对车载场景优化，支持视频播放和小窗模式，让乘客在旅途中享受B站内容。',

  // ===== 系统工具 =====
  'lanshare': 'LANShare是一款局域网文件传输工具，帮助用户在手机和车机之间快速无线传输文件，无需数据线即可分享APK、图片等文件。',
  'ES文件浏览器': 'ES文件浏览器是经典的安卓文件管理工具，支持浏览本地存储、网络邻居、SMB共享等，提供便捷的文件复制、移动和管理功能。',
  '沙发管家': '沙发管家是专为此类市场打造的应用，支持海量APP下载更新、清理加速和系统优化，是车机用户必备的应用管理工具。',
  '当贝市场': '当贝市场是知名的智能电视应用市场，车机版提供丰富的车载应用下载，包括导航、音乐、视频等多类应用，方便用户扩展车机功能。',
  '快马市场': '快马市场是专注于智能车机的应用分发平台，提供多种车载应用的下载和更新服务，帮助用户便捷管理车机软件。',
};

// ─── 根据 name + type 构建 key ───────────────────────────────────
function getKey(name, type) {
  // 移除空格后的 name + type
  return name.replace(/\s+/g, '') + '|' + type;
}

// ─── 智能匹配描述 ────────────────────────────────────────────────
function getDescription(name, type, category) {
  const key = getKey(name, type);

  // 精确匹配
  if (DESCRIPTIONS[name]) {
    return DESCRIPTIONS[name];
  }

  // 模糊匹配（处理名称略有不同的情况）
  // 比如 "高德地图" 可能匹配 "高德地图 车机版"
  for (const [descName, desc] of Object.entries(DESCRIPTIONS)) {
    const descKey = getKey(descName, '');
    const nameWithoutType = name.replace(/\s+/g, '');
    if (descKey.startsWith(nameWithoutType) || nameWithoutType.startsWith(descKey.split('|')[0])) {
      return desc;
    }
  }

  // 基于分类的默认描述
  if (category === '车机桌面') {
    return `一款安卓车机桌面应用，提供主题切换、快捷方式和桌面布局自定义等功能。`;
  } else if (category === '导航地图') {
    return `一款实用的地图导航应用，提供精准的路线规划和实时路况信息。`;
  } else if (category === '影音娱乐') {
    return `一款车载娱乐应用，提供音乐、视频或有声内容播放服务。`;
  } else if (category === '系统工具') {
    return `一款车机系统工具应用，帮助用户管理车机文件和应用程序。`;
  }

  return '暂无描述';
}

// ─── 主程序 ─────────────────────────────────────────────────────
async function main() {
  const inputPath = path.join(__dirname, '..', 'output.json');
  const outputPath = path.join(__dirname, '..', 'output_with_descriptions.json');

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ 找不到 input 文件: ${inputPath}`);
    console.log('请先运行: node src/crawl-all.js');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

  console.log(`\n=== 重建描述 ===`);
  console.log(`输入: ${inputPath}`);
  console.log(`共 ${data.results.length} 条软件\n`);

  // 重建 results，替换 description
  const rebuilt = {
    ...data,
    generatedAt: new Date().toISOString(),
    note: '描述已根据软件名称硬编码生成',
    results: data.results.map(r => {
      const newDesc = getDescription(r.name, r.type, r.category);
      const changed = r.description !== newDesc;
      if (changed) {
        console.log(`✅ ${r.name} [${r.type}]`);
        console.log(`   旧: ${r.description.substring(0, 50)}...`);
        console.log(`   新: ${newDesc.substring(0, 50)}...`);
      } else {
        console.log(`➖ ${r.name} [${r.type}] (未变)`);
      }
      return { ...r, description: newDesc };
    }),
  };

  fs.writeFileSync(outputPath, JSON.stringify(rebuilt, null, 2), 'utf-8');

  console.log(`\n\n=== 完成 ===`);
  console.log(`输出: ${outputPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
