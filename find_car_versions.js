const https = require('https');

function get(url, ua) {
  return new Promise((resolve) => {
    https.get(url, {headers:{'User-Agent':ua||'Mozilla/5.0','Accept':'text/html,*/*'}}, r => {
      let d='';r.on('data',c=>d+=c);r.on('end',()=>resolve({status:r.statusCode,location:r.headers.location||'',body:d}));
    }).on('error',e=>resolve({status:'err'})).setTimeout(10000,function(){this.destroy();resolve({status:'timeout'});});
  });
}

(async()=>{
  // QQ音乐车机版下载页
  const qqs = await get('https://y.qq.com/product/car/', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120');
  console.log('QQ音乐车机状态:', qqs.status);
  // 找apk链接
  const matches = qqs.body.match(/https:\/\/[^\s"']+\.apk[^\s"']*/g);
  console.log('QQ音乐APK链接:', matches);

  // 尝试 QQ音乐 车机版具体下载页面
  const qqs2 = await get('https://y.qq.com/product/car/index.html', 'Mozilla/5.0');
  const matches2 = qqs2.body.match(/https:\/\/[^\s"']+\.apk[^\s"']*/g);
  console.log('QQ音乐APK链接2:', matches2);

  // 哔哩哔哩车机版
  const bil = await get('https://bilibili.com/page-tool/car', 'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36 Chrome/90');
  console.log('\nB站车机状态:', bil.status);
  const bmatch = bil.body.match(/https:\/\/[^\s"']+\.apk[^\s"']*/g);
  console.log('B站APK链接:', bmatch || '无');

  // 尝试 B站 车机版直接下载
  const bil2 = await get('https://dl.hdslb.com/mobile/latest/android64/', 'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36');
  console.log('\nB站android64目录状态:', bil2.status);
  // 搜索文件名
  const links = bil2.body.match(/href="[^"]+\.apk[^"]*"/g);
  console.log('B站apk文件:', links);
})();
