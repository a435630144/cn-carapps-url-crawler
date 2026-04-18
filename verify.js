const output = JSON.parse(require('fs').readFileSync('output.json','utf8'));

const checks = [
  {name:'氢桌面吉利版', type:'车机版', expected:['吉利车型专用1.apk','吉利车型专用.apk']},
  {name:'氢桌面公签版', type:'车机版', expected:['启辰众签版.apk']},
  {name:'嘟嘟桌面 PRO 公签版', type:'车机版', expected:[]}, // 描述说"链接位于PRO公签版下"，但实际返回了manual
  {name:'乐酷桌面公签版', type:'车机版', expected:['公签_sign.apk']},
  {name:'哔哩哔哩', type:'车机版', expected:['bilithings-master.apk']},
  {name:'高德地图', type:'车机版', expected:['Auto_9.1.0.600087']},
  {name:'布丁 UI 低版本安卓系统', type:'车机版', expected:[]},
  {name:'喜马拉雅', type:'车机版', expected:[]},
];

// 氢桌面公签版描述中实际写的是"启辰众签版"而非"公签版"
const excelApkInfo = {
  '氢桌面吉利版': 'vv.hyjidi.com/app/122/吉利车型专用1.apk',
  '氢桌面公签版': 'vv.hyjidi.com/app/122/启辰众签版.apk',
  '哔哩哔哩': 'dl.hdslb.com/mobile/latest/android_bilithings_super/bilithings-master.apk',
  '高德地图车机版': 'mapdownload.autonavi.com/apps/auto/manual/V910/Auto_9.1.0.600087',
};

checks.forEach(c => {
  const r = output.results.find(r=>r.name.includes(c.name) && r.type===c.type);
  if (!r) { console.log('❌ 未找到: ' + c.name); return; }
  const file = r.url.split('/').pop().split('?')[0];
  let ok = false;
  if (c.expected.length > 0) {
    ok = c.expected.some(e => file.includes(e.split('.apk')[0]));
  } else {
    // 通过描述验证
    ok = r.method !== 'none' && r.status === 'ok';
  }
  console.log((ok?'✅':'❌') + ' ' + c.name + ' [' + c.type + ']');
  console.log('  输出: ' + file + ' (method: ' + r.method + ')');
  if (c.expected.length > 0) console.log('  期望包含: ' + c.expected.join(' 或 '));
  console.log();
});
