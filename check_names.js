const d = require('D:/OneDrive/自学编程/claude code/work3/output.json');
const entries = Array.isArray(d.results) ? d.results : [];
entries.filter(r => r.name && (r.name.includes('乐酷') || r.name.includes('嘟嘟') || r.name.includes('布丁')))
  .forEach(r => console.log(JSON.stringify(r.name), '| type:', r.type, '| url:', r.url?.substring(0,70)));
