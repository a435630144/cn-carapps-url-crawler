# 车机软件 APK 爬虫

车机软件 APK 下载链接动态爬取工具，从各软件官方下载页抓取 APK 直链。

## 快速开始

```bash
node src/crawl-all.js
```

生成 `output.json`，显示成功/失败统计。

**当前状态：30/30 全部成功**

## 数据文件

| 文件 | 说明 |
|------|------|
| `车机软件汇总.xlsx` | 软件配置表（Sheet1，第2行为表头，数据从第3行开始） |
| `output.json` | 爬取结果（动态生成，含 method 字段） |

Excel 列结构：软件名称 | 类型 | 官方下载地址 | 描述 | 来源 | 分类

## 爬取策略

三级爬取机制，依次尝试：

| 优先级 | 方法 | 说明 |
|--------|------|------|
| ① | HTTP → HTML解析 | 直接请求下载页，解析 HTML 中的 APK 直链 |
| ② | Puppeteer 拦截 | JS 动态渲染页面，拦截网络请求中的 APK 文件 |
| ③ | MANUAL Fallback | 前两步失败时，使用硬编码的备选 URL |

**成功标准**：APK URL 返回 HTTP 200 且 Content-Type 为 `application/vnd.android.package-archive`

## method 字段说明

| method | 含义 |
|--------|------|
| `html-parse` | 官方下载页 HTML 中解析出 APK 直链 |
| `html-parse-section` | HTML 中分 Section 解析（嘟嘟桌面多版本） |
| `puppeteer-intercept` | Puppeteer 拦截 JS 发起的 APK 下载请求 |
| `manual` | MANUAL 备选表中的 URL |
| `none` | 爬取失败（无有效 URL） |

## 爬取结果统计

### 方法统计

| 方法 | 数量 | 软件 |
|------|------|------|
| html-parse | 20 | 氢桌面(3)、乐酷桌面(2)、布丁UI(2)、智车桌面(2)、高德地图车机版、酷狗音乐、哔哩哔哩、lanshare、ES文件浏览器、沙发管家、当贝市场、快马市场 |
| html-parse-section | 3 | 嘟嘟桌面PRO(公版/MINI/公签) |
| puppeteer-intercept | 1 | 酷我音乐极简版 |
| manual | 6 | 百度地图(2)、腾讯地图、网易云音乐、QQ音乐、酷我音乐、汽水音乐 |

### 分类统计

| 分类 | 数量 | 软件 |
|------|------|------|
| 车机桌面 | 12 | 嘟嘟桌面PRO(3)、氢桌面(3)、乐酷桌面(2)、布丁UI(2)、智车桌面(2) |
| 导航地图 | 5 | 高德地图(2)、百度地图(2)、腾讯地图 |
| 影音娱乐 | 8 | 网易云音乐、QQ音乐、酷我音乐(2)、酷狗音乐、汽水音乐、喜马拉雅、哔哩哔哩 |
| 系统工具 | 5 | lanshare、ES文件浏览器、沙发管家、当贝市场、快马市场 |

### 全部爬取记录

| # | 软件 | 版本 | 方法 | 状态 |
|---|------|------|------|------|
| 1 | 嘟嘟桌面 PRO 公版 | 车机版 | html-parse-section | ok |
| 2 | 嘟嘟桌面 PRO MINI版 | 车机版 | html-parse-section | ok |
| 3 | 嘟嘟桌面 PRO 公签版 | 车机版 | html-parse-section | ok |
| 4 | 氢桌面普通版 | 车机版 | html-parse | ok |
| 5 | 氢桌面吉利版 | 车机版 | html-parse | ok |
| 6 | 氢桌面公签版 | 车机版 | html-parse | ok |
| 7 | 乐酷桌面普通版 | 车机版 | html-parse | ok |
| 8 | 乐酷桌面公签版 | 车机版 | html-parse | ok |
| 9 | 布丁UI普通版 | 车机版 | html-parse | ok |
| 10 | 布丁UI低版本安卓系统 | 车机版 | html-parse | ok |
| 11 | 智车桌面公签版 | 车机版 | html-parse | ok |
| 12 | 智车桌面普通版 | 车机版 | html-parse | ok |
| 13 | 高德地图 | 车机版 | html-parse | ok |
| 14 | 百度地图 | 车机版 | manual | ok |
| 15 | 腾讯地图 | 车机版 | manual | ok |
| 16 | 高德地图 | 手机版 | manual | ok |
| 17 | 百度地图 | 手机版 | manual | ok |
| 18 | 网易云音乐 | 车机版 | manual | ok |
| 19 | QQ音乐 | 车机版 | manual | ok |
| 20 | 酷我音乐 | 车机版 | manual | ok |
| 21 | 酷我音乐极简版 | 车机版 | puppeteer-intercept | ok |
| 22 | 酷狗音乐 | 车机版 | html-parse | ok |
| 23 | 汽水音乐 | 手机版 | manual | ok |
| 24 | 喜马拉雅 | 车机版 | manual | ok |
| 25 | 哔哩哔哩 | 车机版 | html-parse | ok |
| 26 | lanshare | 手机版 | html-parse | ok |
| 27 | ES文件浏览器 | 手机版 | html-parse | ok |
| 28 | 沙发管家 | 车机版 | html-parse | ok |
| 29 | 当贝市场 | 车机版 | html-parse | ok |
| 30 | 快马市场 | 车机版 | html-parse | ok |

## 导入数据库

```bash
cd ../webdemo2/backend && npx ts-node src/software/import-craw.ts
```

## 已知限制

| 软件 | 问题 | 当前处理 |
|------|------|---------|
| 智车桌面公签版 | yxyyds.cn 下载页不稳定，偶尔超时 | MANUAL，需定期验证 |
| 酷我音乐公版 | CDN (pkgdown.kuwo.cn) 403 直接访问 | MANUAL |
| 高德地图手机版 | wap.amap.com 为JS渲染+二维码 | MANUAL |
| 网易云音乐车机版 | music.163.com 为JS渲染 | MANUAL |
| 汽水音乐手机版 | music.douyin.com 为JS渲染+二维码 | MANUAL |
| 喜马拉雅车机版 | car.ximalaya.com 为JS渲染 | MANUAL |

## 核心文件

- `src/crawl-all.js` — 主爬虫脚本
- `output.json` — 爬取结果
- `车机软件汇总.xlsx` — 软件列表配置
