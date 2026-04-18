/**
 * 诊断：检查 output.json 中 URL 的正确性
 * 找出所有 name 出现多次的记录，核对 allFoundUrls
 */
const oldOutput = require('./output.json');

const byName = {};
for (const r of oldOutput.results || []) {
  if (!byName[r.name]) byName[r.name] = [];
  byName[r.name].push(r);
}

console.log('=== 同名多条目的软件 ===\n');
for (const [name, entries] of Object.entries(byName)) {
  if (entries.length > 1) {
    console.log(`【${name}】`);
    for (const e of entries) {
      console.log(`  [${e.type}] url=${e.url?.substring(0,60)}`);
      console.log(`  allFoundUrls (${e.allFoundUrls?.length}):`);
      for (const u of (e.allFoundUrls || []).slice(0,3)) {
        console.log(`    - ${u.substring(0,80)}`);
      }
    }
    console.log();
  }
}

console.log('=== QQ音乐 allFoundUrls 详情 ===');
const qq = oldOutput.results?.find(r => r.name === 'QQ音乐');
if (qq) {
  console.log('所有找到的URL:');
  (qq.allFoundUrls || []).forEach((u, i) => console.log(`  ${i+1}. ${u}`));
}

console.log('\n=== 哔哩哔哩 allFoundUrls 详情 ===');
const bilibili = oldOutput.results?.find(r => r.name === '哔哩哔哩');
if (bilibili) {
  (bilibili.allFoundUrls || []).forEach((u, i) => console.log(`  ${i+1}. ${u}`));
}
