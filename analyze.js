const XLSX = require('xlsx');
const fs = require('fs');
const wb = XLSX.readFile('车机软件汇总.xlsx');
const ws = wb.Sheets['Sheet1'];
const data = XLSX.utils.sheet_to_json(ws, {header: 1, defval: '', range: 1});
const output = JSON.parse(fs.readFileSync('output.json', 'utf8'));

const issues = [];
data.slice(1).forEach((row, i) => {
  const name = row[0], type = row[1], excelUrl = row[2], desc = row[3];
  const out = output.results.find(r => r.name === name && r.type === type);
  if (!out) return;

  const apkMatches = [...desc.matchAll(/href="(https?:\/\/[^"]+\.apk[^"]*)"/g)].map(m => m[1]);
  const directApk = [...desc.matchAll(/"(https?:\/\/[^"']+\.apk[^"']*)"/g)].map(m => m[1]);

  let isWrong = false;
  let reason = '';

  if (apkMatches.length > 0 && out.method === 'manual') {
    isWrong = true;
    reason = '描述中有APK但用了MANUAL fallback';
  }
  if (apkMatches.length > 0 && out.url) {
    const outFile = out.url.split('/').pop().split('?')[0];
    const match = apkMatches.find(u => {
      const uFile = u.split('/').pop().split('?')[0];
      return outFile === uFile || u.includes(outFile) || outFile.includes(uFile.split('.apk')[0]);
    });
    if (!match) {
      isWrong = true;
      reason = '输出URL与描述中APK不匹配';
    }
  }
  if (out.method === 'html-parse' && desc.includes('点击事件')) {
    isWrong = true;
    reason = '描述为点击事件但用了html-parse（需要puppeteer拦截）';
  }
  if (out.method === 'manual' && desc.includes('HTML解析')) {
    isWrong = true;
    reason = '描述说HTML解析但用了MANUAL';
  }

  if (isWrong) {
    issues.push({i: i+1, name, type, reason, outUrl: out.url, method: out.method, apkMatches, desc: desc.substring(0, 200)});
  }
});

console.log('=== 问题条目分析 ===\n');
issues.forEach(issue => {
  console.log(`【${issue.i}】${issue.name} [${issue.type}]`);
  console.log(`  问题: ${issue.reason}`);
  console.log(`  当前: ${issue.outUrl}`);
  if (issue.apkMatches.length > 0) console.log(`  描述中APK: ${issue.apkMatches.join(', ')}`);
  else console.log(`  描述: ${issue.desc}`);
  console.log(`  method: ${issue.method}`);
  console.log();
});
console.log('共', issues.length, '条问题');
