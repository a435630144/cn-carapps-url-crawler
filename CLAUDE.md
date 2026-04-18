# CLAUDE.md - 车机软件 APK 爬虫与数据管理

## 项目状态：✅ 100% 爬取成功（30/30）

运行命令：
```bash
node src/crawl-all.js
```

---

## 数据文件

- **Excel**：`车机软件汇总.xlsx` Sheet1（30行数据，第2行为表头）
  - 列结构（0-indexed）：软件名称 | 类型 | 官方下载地址 | 描述 | 来源 | 分类
  - 数据从第3行开始

- **权威数据**：`output.json`（爬取生成，含 method 字段）
  - 运行 `node src/crawl-all.js` 从 Excel 读取配置，动态爬取 URL
  - 数据库导入：`cd ../webdemo2/backend && npx ts-node src/software/import-craw.ts`

---

## 爬取策略

### 三级爬取机制

| 优先级 | 方法 | 说明 |
|--------|------|------|
| ① | HTTP → HTML解析 | 直接请求下载页，解析 HTML 中的 APK 直链 |
| ② | Puppeteer 拦截 | JS 动态渲染页面，拦截网络请求中的 APK 文件 |
| ③ | MANUAL Fallback | 前两步失败时，使用硬编码的备选 URL |

**成功标准**：APK URL 必须返回 HTTP 200 且 Content-Type 为 `application/vnd.android.package-archive`

### method 字段说明

| method | 含义 |
|--------|------|
| `html-parse` | 官方下载页 HTML 中解析出 APK 直链 |
| `html-parse-section` | HTML 中分 Section 解析（嘟嘟桌面多版本） |
| `puppeteer-intercept` | Puppeteer 拦截 JS 发起的 APK 下载请求 |
| `manual` | MANUAL 备选表中的 URL |
| `none` | 爬取失败（无有效 URL） |

---

## output.json 结构

```json
{
  "total": 30,
  "success": 30,
  "failed": 0,
  "generatedAt": "2026-04-18T...",
  "results": [
    {
      "name": "高德地图",
      "type": "车机版",
      "category": "导航地图",
      "source": "官方",
      "description": "...",
      "url": "https://...",
      "excelUrl": "https://...",
      "method": "html-parse | puppeteer-intercept | manual",
      "status": "ok | fail",
      "note": "...",
      "allFound": ["备用URL1", "备用URL2"]
    }
  ]
}
```

---

## 爬取记录（2026-04-18）

| # | 软件 | 版本 | 方法 | 状态 |
|---|------|------|------|------|
| 1 | 嘟嘟桌面 PRO 公版 | 车机版 | html-parse-section | ✅ |
| 2 | 嘟嘟桌面 PRO MINI版 | 车机版 | html-parse-section | ✅ |
| 3 | 嘟嘟桌面 PRO 公签版 | 车机版 | html-parse-section | ✅ |
| 4 | 氢桌面普通版 | 车机版 | html-parse | ✅ |
| 5 | 氢桌面吉利版 | 车机版 | html-parse | ✅ |
| 6 | 氢桌面公签版 | 车机版 | html-parse | ✅ |
| 7 | 乐酷桌面普通版 | 车机版 | html-parse | ✅ |
| 8 | 乐酷桌面公签版 | 车机版 | html-parse | ✅ |
| 9 | 布丁UI普通版 | 车机版 | html-parse | ✅ |
| 10 | 布丁UI低版本安卓系统 | 车机版 | html-parse | ✅ |
| 11 | 智车桌面公签版 | 车机版 | html-parse | ✅ |
| 12 | 智车桌面普通版 | 车机版 | html-parse | ✅ |
| 13 | 高德地图 | 车机版 | html-parse | ✅ |
| 14 | 百度地图 | 车机版 | manual | ✅ |
| 15 | 腾讯地图 | 车机版 | manual | ✅ |
| 16 | 高德地图 | 手机版 | manual | ✅ |
| 17 | 百度地图 | 手机版 | manual | ✅ |
| 18 | 网易云音乐 | 车机版 | manual | ✅ |
| 19 | QQ音乐 | 车机版 | manual | ✅ |
| 20 | 酷我音乐 | 车机版 | manual | ✅ |
| 21 | 酷我音乐极简版 | 车机版 | puppeteer-intercept | ✅ |
| 22 | 酷狗音乐 | 车机版 | html-parse | ✅ |
| 23 | 汽水音乐 | 手机版 | manual | ✅ |
| 24 | 喜马拉雅 | 车机版 | manual | ✅ |
| 25 | 哔哩哔哩 | 车机版 | html-parse | ✅ |
| 26 | lanshare | 手机版 | html-parse | ✅ |
| 27 | ES文件浏览器 | 手机版 | html-parse | ✅ |
| 28 | 沙发管家 | 车机版 | html-parse | ✅ |
| 29 | 当贝市场 | 车机版 | html-parse | ✅ |
| 30 | 快马市场 | 车机版 | html-parse | ✅ |

**总计：30/30（100%）**

### 方法统计

| 方法 | 数量 | 软件 |
|------|------|------|
| html-parse | 17 | 氢桌面、乐酷桌面、布丁UI、智车桌面(普通)、高德地图车机版、酷狗、哔哩哔哩、lanshare、ES文件浏览器、沙发管家、当贝市场、快马市场 |
| html-parse-section | 3 | 嘟嘟桌面PRO（公版/MINI/公签） |
| puppeteer-intercept | 1 | 酷我音乐极简版 |
| manual | 9 | 百度地图车机/手机、高德地图手机、腾讯地图、网易云音乐、QQ音乐、酷我音乐、汽水音乐、喜马拉雅 |

---

## 已知限制（⚠️ 需关注）

| 软件 | 问题 | 当前处理 |
|------|------|---------|
| 智车桌面公签版 | yxyyds.cn 下载页不稳定，偶尔超时 | MANUAL 可用，需定期验证 |
| 酷我音乐公版 | CDN (pkgdown.kuwo.cn) 403 直接访问，Puppeteer 无法拦截（无JS渲染按钮） | MANUAL |
| 高德地图手机版 | wap.amap.com 为JS渲染+二维码，无法自动抓取 | MANUAL |
| 网易云音乐车机版 | music.163.com 为JS渲染，无车载版下载入口 | MANUAL |
| 汽水音乐手机版 | music.douyin.com/qishui 为JS渲染+二维码 | MANUAL |
| 喜马拉雅车机版 | car.ximalaya.com 为JS渲染，无APK拦截 | MANUAL |
| 哔哩哔哩车机版 | 无官方车机版，用 TV 版 android64 替代 | html-parse |

---

## 导入数据库流程

1. 运行爬虫：`node src/crawl-all.js`（生成 `output.json`）
2. 确认 URL 有效（检查 `status: fail` 的条目）
3. 运行：`cd ../webdemo2/backend && npx ts-node src/software/import-craw.ts`

---

## 核心文件

- `src/crawl-all.js` — 主爬虫脚本（三级爬取）
- `output.json` — 爬取结果（动态生成）
- `车机软件汇总.xlsx` — 软件列表配置
- `import-craw.ts` — 导入 MySQL（位于 webdemo2/backend）

---

## 软件分类统计

| 分类 | 数量 | 软件 |
|------|------|------|
| 车机桌面 | 12 | 嘟嘟桌面PRO(3)、氢桌面(3)、乐酷桌面(2)、布丁UI(2)、智车桌面(2) |
| 导航地图 | 4 | 高德地图(2)、百度地图(2) |
| 影音娱乐 | 9 | QQ音乐、酷我音乐(2)、酷狗音乐、汽水音乐、喜马拉雅、哔哩哔哩、网易云音乐 |
| 系统工具 | 5 | lanshare、ES文件浏览器、沙发管家、当贝市场、快马市场 |
