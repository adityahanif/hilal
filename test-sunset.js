// Self-check: jam perhitungan harus otomatis = maghrib tanggal terpilih di lokasi terpilih.
// Jalankan dari root repo:  node test-sunset.js
const Astronomy = require('./astronomy.browser.min.js');
const fmt = (tz, d) => new Intl.DateTimeFormat('id-ID', { timeZone: tz, dateStyle: 'long', timeStyle: 'short' }).format(d);

function sunsetOfChosenDate(lat, lng, off) {
    // Replika alur script.js: parse "d/m/Y" -> penyesuaian zona target -> SearchRiseSet
    let dateObj = new Date(2026, 5, 10); // 10/06/2026, tengah malam waktu browser
    const isoString = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}T${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}:00`;
    const adj = new Date(`${isoString}${off}`);
    if (!isNaN(adj.getTime())) dateObj = adj;
    const obs = new Astronomy.Observer(lat, lng, 0);
    return Astronomy.SearchRiseSet('Sun', obs, -1, Astronomy.MakeTime(dateObj), 2).date;
}

const cases = [
    ['Jakarta', -6.1755, 106.8272, 'Asia/Jakarta', '+07:00'],
    ['New York', 40.7128, -74.006, 'America/New_York', '-04:00'],
    ['London', 51.5074, -0.1278, 'Europe/London', '+01:00'],
];

for (const [name, lat, lng, tz, off] of cases) {
    const d = sunsetOfChosenDate(lat, lng, off);
    const text = fmt(tz, d);
    if (!text.startsWith('10 Juni')) throw new Error(`${name}: maghrib jatuh di tanggal salah -> ${text}`);
    console.log(`OK ${name}: ${text}`);
}
console.log('Semua kasus lolos: maghrib selalu di tanggal terpilih.');
