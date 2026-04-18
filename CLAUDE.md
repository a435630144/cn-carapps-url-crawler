# CLAUDE.md - 车机软件 APK 爬虫与数据管理

## 项目状态：✅ 动态爬取已恢复

运行命令：
```bash
node src/crawl-all.js
```

---

## 爬取策略

### 三级爬取机制

| 优先级 | 方法 | 说明 |
|--------|------|------|
| ① | HTTP → HTML解析 | 直接请求下载页，解析 HTML 中的 APK 直链 |
| ② | Puppeteer 拦截 | JS 动态渲染页面，拦截网络请求中的 APK 文件 |
| ③ | MANUAL Fallback | 前两步失败时，使用硬编码的备选 URL |

**成功标准**：APK URL 必须返回 HTTP 200 且 Content-Type 为 `application/vnd.android.package-archive`

### Method 字段说明

| method | 含义 |
|--------|------|
| `html-parse` | 官方下载页 HTML 中解析出 APK 直链 |
| `puppeteer-intercept` | Puppeteer 拦截 JS 发起的 APK 下载请求 |
| `manual` | MANUAL 备选表中的 URL |
| `none` | 爬取失败（无有效 URL） |

---

## 数据文件

- **Excel**：`车机软件汇总.xlsx` Sheet1（27行，含表头）
  - 列结构（0-indexed）：软件名称 | 类型 | 官方下载地址 | 描述 | 来源 | 分类
  - 表头在第2行，数据从第3行开始
  - 高德地图、百度地图各出现2次（车机版+手机版），用 `name+type` 联合键唯一区分

- **权威数据**：`output.json`（爬取生成，含 method 字段）
  - 运行 `node src/crawl-all.js` 从 Excel 读取配置，动态爬取 URL
  - 数据库导入：`cd ../webdemo2/backend && npx ts-node src/software/import-craw.ts`

---

## output.json 结构

```json
{
  "total": 25,
  "success": 24,
  "failed": 1,
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

| 软件 | 版本 | 方法 | 状态 |
|------|------|------|------|
| 嘟嘟桌面 PRO 公版 | 车机版 | html-parse | ✅ |
| 嘟嘟桌面 PRO MINI版 | 车机版 | html-parse（与公版同APK） | ✅ |
| 嘟嘟桌面 PRO 公签版 | 车机版 | html-parse（与公版同APK） | ✅ |
| 氢桌面普通版 | 车机版 | html-parse | ✅ |
| 氢桌面吉利版 | 车机版 | manual | ✅ |
| 氢桌面公签版 | 车机版 | manual | ✅ |
| 乐酷桌面普通版 | 车机版 | html-parse | ✅ |
| 乐酷桌面公签版 | 车机版 | html-parse（与普通版同APK） | ✅ |
| 布丁UI普通版 | 车机版 | html-parse | ✅ |
| 布丁UI低版本安卓系统 | 车机版 | html-parse | ✅ |
| 智车桌面公签版 | 车机版 | manual | ✅ |
| 智车桌面普通版 | 车机版 | manual | ✅ |
| 高德地图 | 车机版 | html-parse | ✅ |
| 高德地图 | 手机版 | manual（wap.amap.com为JS渲染+二维码） | ✅ |
| 百度地图 | 车机版 | manual（官方下载页无APK直链） | ✅ |
| 百度地图 | 手机版 | html-parse | ✅ |
| 腾讯地图 | 车机版 | manual（官方无APK直链） | ✅ |
| 网易云音乐 | 车机版 | manual（官方无APK直链） | ✅ |
| QQ音乐 | 车机版 | html-parse | ✅ |
| 酷我音乐 | 车机版 | manual（CDN 403，需浏览器Session） | ✅ |
| 酷我音乐极简版 | 车机版 | puppeteer-intercept | ✅ |
| 酷狗音乐 | 车机版 | manual（download.kugou.com为JS渲染） | ✅ |
| 汽水音乐 | 手机版 | manual | ✅ |
| 喜马拉雅 | 车机版 | manual（car.ximalaya.com为JS渲染） | ✅ |
| 哔哩哔哩 | 车机版 | html-parse（TV版） | ✅ |

**成功：24/25（96%）**

---

## 已知限制（⚠️ 需关注）

| 软件 | 问题 | 当前处理 |
|------|------|---------|
| 智车桌面公签版 | yxyyds.cn 下载页不稳定，偶尔超时 | MANUAL 可用，需定期验证 |
| 酷我音乐公版 | CDN (pkgdown.kuwo.cn) 403 直接访问，Puppeteer 无法拦截（无JS渲染按钮） | MANUAL 返回403，需浏览器手动抓取 |
| 嘟嘟桌面 PRO 三个子版本 | HTML 只返回一个 APK（可能实际共用，或需要登录区分） | 暂用同一APK |
| 乐酷桌面普通/公签版 | HTML 只返回一个 APK | 暂用同一APK |
| 布丁UI 普通/低版本 | HTML 只返回一个 APK | 暂用同一APK |
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
