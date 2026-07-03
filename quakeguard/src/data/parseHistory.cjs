const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const RAW_FILE = path.join(__dirname, 'raw', 'EQK_지진정보_201608_202607.csv');
const OUT_FILE = path.join(__dirname, 'history.json');

const buf = fs.readFileSync(RAW_FILE);
const text = iconv.decode(buf, 'euc-kr');
const lines = text.split('\n').filter(l => l.trim() !== '');

const historyData = [];

// Skip header (index 0)
for (let i = 1; i < lines.length; i++) {
  const parts = lines[i].split(',');
  if (parts.length >= 6) {
    const magnitude = parseFloat(parts[1]);
    // 규모 3.0 이상만 필터링
    if (magnitude >= 3.0) {
      historyData.push({
        id: `HIST-${i}`,
        date: parts[0],
        magnitude: magnitude,
        depth: parseFloat(parts[2]) || 0,
        lat: parseFloat(parts[3]) || 0,
        lng: parseFloat(parts[4]) || 0,
        location: parts[5].trim()
      });
    }
  }
}

const outJson = { data: historyData };
fs.writeFileSync(OUT_FILE, JSON.stringify(outJson, null, 2), 'utf-8');
console.log(`Successfully parsed ${historyData.length} earthquake records >= M3.0`);
