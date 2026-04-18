const https = require('https');

function fetch(url) {
  return new Promise(res => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 15000
    }, r => {
      let data = '';
      r.on('data', c => data += c);
      r.on('end', () => res({ s: r.statusCode, data }));
    }).on('error', e => res({ s: 'err', data: e.message }));
  });
}

(async () => {
  const r = await fetch('https://dudu-lucky.com/guide/download.html');
  console.log('Status:', r.s);
  console.log('HTML length:', r.data.length);

  // Find all apk-related URLs
  const apkMatches = [];
  const apkRegex = /https?:\/\/[^\s"'<>]+\.apk[^\s"'<>]*/gi;
  let m;
  while ((m = apkRegex.exec(r.data)) !== null) {
    apkMatches.push(m[0]);
  }
  console.log('\n=== APK URLs found ===');
  apkMatches.forEach((u, i) => console.log(i + 1 + ':', u));

  // Find all links with download-related text
  const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*(?:pro|PRO|公版|MINI|公签|普通版|下载)[^<]*)<\/a>/gi;
  console.log('\n=== Download links ===');
  while ((m = linkRegex.exec(r.data)) !== null) {
    console.log('URL:', m[1], '| Text:', m[2].trim());
  }

  // Show raw HTML around download buttons
  const btnIdx = r.data.indexOf('pro');
  if (btnIdx > -1) {
    console.log('\n=== HTML context around "pro" ===');
    console.log(r.data.substring(Math.max(0, btnIdx - 200), btnIdx + 500));
  }
})();
