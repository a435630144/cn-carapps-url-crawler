# 车机软件 APK 爬虫

车机软件 APK 下载链接动态爬取工具，自动从各软件官方下载页抓取 APK 直链。

## 快速开始

```bash
node src/crawl-all.js
```

输出 `output.json`，显示成功/失败统计。

## 数据文件

| 文件 | 说明 |
|------|------|
| `车机软件汇总.xlsx` | 软件配置表（Sheet1，第2行为表头，数据从第3行开始） |
| `output.json` | 爬取结果（动态生成） |
| `src/crawl-all.js` | 主爬虫脚本 |

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

## 导入数据库

```bash
cd ../webdemo2/backend && npx ts-node src/software/import-craw.ts
```

## 核心文件

- `src/crawl-all.js` — 主爬虫脚本
- `output.json` — 爬取结果
- `车机软件汇总.xlsx` — 软件列表配置

## 已知限制

| 软件 | 问题 | 当前处理 |
|------|------|---------|
| 智车桌面公签版 | yxyyds.cn 下载页不稳定，偶尔超时 | MANUAL，需定期验证 |
| 酷我音乐公版 | CDN (pkgdown.kuwo.cn) 403 直接访问 | MANUAL |
| 高德地图手机版 | wap.amap.com 为JS渲染+二维码 | MANUAL |
| 网易云音乐车机版 | music.163.com 为JS渲染 | MANUAL |
| 汽水音乐手机版 | music.douyin.com 为JS渲染+二维码 | MANUAL |
| 喜马拉雅车机版 | car.ximalaya.com 为JS渲染 | MANUAL |
| 哔哩哔哩车机版 | 无官方车机版，用 TV 版 android64 替代 | html-parse |
