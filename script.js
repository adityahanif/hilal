document.addEventListener('DOMContentLoaded', () => {
    // 0. Update Current Date Display (Masehi & Hijriah)
    const updateTodayDate = () => {
        const now = new Date();
        const masehiFormatter = new Intl.DateTimeFormat('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        // Use islamic-umalqura for a reliable Hijri calculation (standard Umm al-Qura)
        const hijriFormatter = new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        const masehiDate = masehiFormatter.format(now);
        const hijriDate = hijriFormatter.format(now);

        const dateElement = document.getElementById('current-date-info');
        if (dateElement) {
            dateElement.textContent = `Hari ini: ${masehiDate} / ${hijriDate} (Kalender Ummul Qura)`;
        }
    };
    updateTodayDate();
    // 1. Initialize Default Map (Jakarta)
    let defaultLat = -6.175500;
    let defaultLng = 106.827171;

    // Fail fast with a visible message if Leaflet CDN failed (offline/adblock/file:// block)
    if (typeof L === 'undefined') {
        const mapEl = document.getElementById('map');
        if (mapEl) {
            mapEl.innerHTML = '<div style="padding:1.5rem;color:#f0f4f8;font-size:0.9rem;line-height:1.5">Peta gagal dimuat: library Leaflet (CDN) tidak tersedia.<br>Cek koneksi internet / nonaktifkan AdBlock, lalu hard-refresh (Ctrl+Shift+R).<br>Lihat Console (F12) untuk detail error.</div>';
        }
        console.error("Leaflet 'L' is undefined. CDN blocked or offline.");
        return;
    }

    const map = L.map('map', {
        attributionControl: false
    }).setView([defaultLat, defaultLng], 5);

    // Esri World Topo primary (same as Galura) + Esri Street fallback.
    // NOTE: do NOT use tile.openstreetmap.org directly (osm.wiki/Blocked) or
    // basemaps.cartocdn.com (now requires API key watermark).
    const topoTiles = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19
    });
    const streetFallback = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19
    });
    topoTiles.on('tileerror', () => {
        console.warn("Topo tiles error, falling back to Street.");
        if (!map.hasLayer(streetFallback)) {
            map.removeLayer(topoTiles);
            streetFallback.addTo(map);
        }
    });
    topoTiles.addTo(map);

    // Leaflet needs correct container size after CSS loads / layout settles
    setTimeout(() => map.invalidateSize(), 200);
    window.addEventListener('load', () => map.invalidateSize());

    L.control.attribution({
        position: 'bottomright',
        prefix: false
    }).addTo(map);

    let marker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(map);

    let lastLocationName = "Jakarta, Indonesia"; // Default
    let currentTargetzone = "Asia/Jakarta"; // Default TZ Name
    let currentUtcOffset = "+07:00"; // Default (WIB)
    const tzInfoElement = document.getElementById('tz-info');

    async function updateTimezone(lat, lng) {
        if (!tzInfoElement) return;
        tzInfoElement.textContent = "[Zona Waktu: Mendeteksi...]";
        try {
            // timeapi.io is a reliable public API for this
            const response = await fetch(`https://www.timeapi.io/api/TimeZone/coordinate?latitude=${lat}&longitude=${lng}`);
            const data = await response.json();
            if (data && data.timeZone) {
                currentTargetzone = data.timeZone;
                // API returns currentUtcOffset as an object with 'seconds'
                const offsetData = data.currentUtcOffset;
                let offsetSeconds = 0;
                if (typeof offsetData === 'object' && offsetData !== null) {
                    offsetSeconds = offsetData.seconds || 0;
                } else if (typeof offsetData === 'string') {
                    // Fallback
                    currentUtcOffset = offsetData;
                } else {
                    offsetSeconds = 0;
                }

                if (typeof offsetData !== 'string') {
                    const sign = offsetSeconds >= 0 ? "+" : "-";
                    const absSec = Math.abs(offsetSeconds);
                    const h = Math.floor(absSec / 3600);
                    const m = Math.floor((absSec % 3600) / 60);
                    currentUtcOffset = `${sign}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                }

                tzInfoElement.textContent = `[Zona Waktu: ${currentTargetzone} (UTC ${currentUtcOffset})]`;
            } else {
                throw new Error("Invalid response");
            }
        } catch (error) {
            console.warn("Timezone detection failed, falling back to local:", error);
            // Default behavior if API fails: use typical browser local timezone info
            const localDate = new Date();
            const tzName = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const offsetTotalMin = -localDate.getTimezoneOffset(); // e.g. 330 for +5:30
            const sign = offsetTotalMin >= 0 ? "+" : "-";
            const absMin = Math.abs(offsetTotalMin);
            const h = Math.floor(absMin / 60);
            const m = absMin % 60;
            currentUtcOffset = `${sign}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            currentTargetzone = tzName;
            tzInfoElement.textContent = `[Zona Waktu: ${currentTargetzone} (UTC ${currentUtcOffset})]`;
        }
    }

    // Sync input with Map (defined before geocoder so the callback can use them)
    const inputLat = document.getElementById('lat-input');
    const inputLng = document.getElementById('lng-input');

    // 2. Add Search Box (Geocoder) - optional, must never kill the map/form if CDN fails
    try {
        if (L.Control && typeof L.Control.geocoder === 'function') {
            L.Control.geocoder({
                defaultMarkGeocode: false,
                placeholder: "Cari kota atau lokasi...",
                errorMessage: "Lokasi tidak ditemukan."
            })
                .on('markgeocode', function (e) {
                    const latlng = e.geocode.center;
                    lastLocationName = e.geocode.name; // Capture location name
                    marker.setLatLng(latlng);
                    map.setView(latlng, 13);
                    inputLat.value = latlng.lat.toFixed(6);
                    inputLng.value = latlng.lng.toFixed(6);
                    updateTimezone(latlng.lat, latlng.lng).then(runCalculation);
                })
                .addTo(map);
        } else {
            console.warn("Geocoder plugin not loaded, search box disabled.");
        }
    } catch (geoErr) {
        console.warn("Geocoder init failed, continuing without search:", geoErr);
    }

    inputLat.value = defaultLat.toFixed(6);
    inputLng.value = defaultLng.toFixed(6);

    // Update form when marker is dragged
    marker.on('dragend', function (e) {
        const coord = marker.getLatLng();
        inputLat.value = coord.lat.toFixed(6);
        inputLng.value = coord.lng.toFixed(6);
        lastLocationName = `Titik Koordinat (${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)})`;
        updateTimezone(coord.lat, coord.lng).then(runCalculation);
    });

    // Update map when map is clicked
    map.on('click', function (e) {
        marker.setLatLng(e.latlng);
        inputLat.value = e.latlng.lat.toFixed(6);
        inputLng.value = e.latlng.lng.toFixed(6);
        lastLocationName = `Titik Koordinat (${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)})`;
        updateTimezone(e.latlng.lat, e.latlng.lng).then(runCalculation);
    });

    // Update map when inputs change
    const updateMapFromInput = () => {
        let lat = parseFloat(inputLat.value);
        let lng = parseFloat(inputLng.value);
        if (!isNaN(lat) && !isNaN(lng)) {
            let latlng = new L.LatLng(lat, lng);
            marker.setLatLng(latlng);
            map.flyTo(latlng, 8);
            lastLocationName = `Titik Koordinat (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
            updateTimezone(lat, lng).then(runCalculation);
        }
    };
    inputLat.addEventListener('change', updateMapFromInput);
    inputLng.addEventListener('change', updateMapFromInput);

    // 2. Astronomy Calculation Logics
    const form = document.getElementById('calc-form');

    // Elements to update
    const valAlt = document.getElementById('val-altitude');
    const valElong = document.getElementById('val-elongation');
    const valAge = document.getElementById('val-age');
    const valSunset = document.getElementById('val-sunset');

    const badgeMabims = document.getElementById('badge-mabims');
    const badgeWujudul = document.getElementById('badge-wujudul');
    const critMabims = document.getElementById('crit-mabims');
    const critWujudul = document.getElementById('crit-wujudul');
    const sunsetContainer = document.getElementById('sunset-time-container');
    const hijriDisplay = document.getElementById('hijri-display');
    const conjDisplay = document.getElementById('conjunction-display');

    function animateValue(element, start, end, duration, formatter) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            let current = progress * (end - start) + start;
            element.innerHTML = formatter(current);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    const runCalculation = () => {
        const lat = parseFloat(inputLat.value);
        const lng = parseFloat(inputLng.value);

        if (isNaN(lat) || isNaN(lng)) {
            alert("Harap isi koordinat dengan benar!");
            return;
        }

        try {
            if (typeof Astronomy === 'undefined') {
                throw new Error("Library Astronomy Engine tidak dapat dimuat.");
            }

            const observer = new Astronomy.Observer(lat, lng, 0);

            // "Hari ini" menurut zona waktu lokasi terpilih: mulai pencarian
            // maghrib dari tengah malam tanggal hari ini di zona tersebut.
            const [offH, offM] = currentUtcOffset.split(':').map(Number);
            const offMin = (currentUtcOffset.startsWith('-') ? -1 : 1) * (Math.abs(offH) * 60 + offM);
            const wallNow = new Date(Date.now() + offMin * 60000);
            const startOfDayMs = Date.UTC(wallNow.getUTCFullYear(), wallNow.getUTCMonth(), wallNow.getUTCDate()) - offMin * 60000;
            let timeSearchStart = Astronomy.MakeTime(new Date(startOfDayMs));

            let sunsetEvent = Astronomy.SearchRiseSet('Sun', observer, -1, timeSearchStart, 2);

            let calcTime;
            let sunsetText = "--:--";

            // Formatters for target timezone
            const formatTime = (d) => new Intl.DateTimeFormat('id-ID', {
                timeZone: currentTargetzone,
                hour: '2-digit', minute: '2-digit', hour12: false
            }).format(d);

            const formatDate = (d) => new Intl.DateTimeFormat('id-ID', {
                timeZone: currentTargetzone,
                day: 'numeric', month: 'long', year: 'numeric'
            }).format(d);

            if (sunsetEvent) {
                calcTime = sunsetEvent.date;
                sunsetText = formatTime(calcTime);
                valSunset.innerHTML = sunsetText;
                sunsetContainer.style.display = 'flex';

                hijriDisplay.textContent = `Hasil perhitungan bulan pada tanggal ${formatDate(calcTime)} pukul ${sunsetText} (Zona Waktu: ${currentTargetzone} UTC ${currentUtcOffset}) di ${lastLocationName} adalah:`;
                hijriDisplay.style.fontSize = "1rem";
                hijriDisplay.style.textAlign = "left";
                hijriDisplay.style.marginTop = "0";
                hijriDisplay.style.color = "var(--secondary-color)";
            } else {
                calcTime = new Date();
                sunsetContainer.style.display = 'none';

                hijriDisplay.textContent = `Hasil perhitungan bulan pada ${formatDate(calcTime)} pukul ${formatTime(calcTime)} (Zona Waktu: ${currentTargetzone} UTC ${currentUtcOffset}) pada ${lastLocationName} adalah:`;
                hijriDisplay.style.fontSize = "1.1rem";
                hijriDisplay.style.textAlign = "center";
                hijriDisplay.style.marginTop = "0";
                hijriDisplay.style.color = "var(--secondary-color)";
            }

            const astroTime = Astronomy.MakeTime(calcTime);

            const moonEqu = Astronomy.Equator('Moon', astroTime, observer, true, true);
            const moonHor = Astronomy.Horizon(astroTime, observer, moonEqu.ra, moonEqu.dec, 'normal');
            const altitude = moonHor.altitude;

            const moonGeo = Astronomy.GeoVector('Moon', astroTime, true);
            const sunGeo = Astronomy.GeoVector('Sun', astroTime, true);
            const elongation = Astronomy.AngleBetween(sunGeo, moonGeo);

            const lastNewMoon = Astronomy.SearchMoonPhase(0, astroTime, -30);
            const nextNewMoon = Astronomy.SearchMoonPhase(0, astroTime, 30);
            let ageHours = 0;
            if (lastNewMoon) {
                const ageDays = astroTime.date.getTime() - lastNewMoon.date.getTime();
                ageHours = ageDays / (1000 * 60 * 60);

                const conjDateStr = formatDate(lastNewMoon.date);
                const conjTimeStr = formatTime(lastNewMoon.date);

                let conjInfo = `🌑 Waktu konjungsi (ijtimak) terjadi pada tanggal ${conjDateStr} pukul ${conjTimeStr}`;

                if (nextNewMoon) {
                    const nextDateStr = formatDate(nextNewMoon.date);
                    const nextTimeStr = formatTime(nextNewMoon.date);
                    conjInfo += `, selanjutnya tanggal ${nextDateStr} pukul ${nextTimeStr}`;

                    // Sunset pertama SETELAH konjungsi berikutnya: kalau konjungsi
                    // terjadi sebelum maghrib, ini maghrib di tanggal yang sama;
                    // kalau sesudah maghrib, otomatis maghrib hari berikutnya.
                    const nextSunset = Astronomy.SearchRiseSet('Sun', observer, -1, nextNewMoon, 2);
                    if (nextSunset) {
                        conjInfo += ` dengan waktu terbenam matahari pukul ${formatTime(nextSunset.date)}`;
                    }
                }

                conjInfo += ` (Zona Waktu: ${currentTargetzone} UTC ${currentUtcOffset}).`;

                conjDisplay.textContent = conjInfo;
                conjDisplay.style.display = "block";
                conjDisplay.style.textAlign = "left";
            } else {
                conjDisplay.style.display = "none";
            }

            animateValue(valAlt, 0, altitude, 1000, val => Math.abs(val) < 0.01 && val < 0 ? `-0.00°` : `${val.toFixed(2)}°`);
            animateValue(valElong, 0, elongation, 1000, val => `${val.toFixed(2)}°`);
            animateValue(valAge, 0, ageHours, 1000, val => `${val.toFixed(2)} Jam`);

            let meetMabims = (altitude >= 3.0 && elongation >= 6.4);
            let meetWujudul = (ageHours > 0 && altitude > 0);

            if (meetMabims) {
                badgeMabims.className = 'status-badge meet';
                badgeMabims.textContent = 'Memenuhi Syarat';
                critMabims.style.borderColor = 'var(--success)';
            } else {
                badgeMabims.className = 'status-badge fail';
                badgeMabims.textContent = 'Tidak Memenuhi';
                critMabims.style.borderColor = 'var(--danger)';
            }

            if (meetWujudul) {
                badgeWujudul.className = 'status-badge meet';
                badgeWujudul.textContent = 'Memenuhi Syarat';
                critWujudul.style.borderColor = 'var(--success)';
            } else {
                badgeWujudul.className = 'status-badge fail';
                badgeWujudul.textContent = 'Tidak Memenuhi';
                critWujudul.style.borderColor = 'var(--danger)';
            }

        } catch (error) {
            console.error("Error Detail Astronomy:", error);
            alert("Gagal melakukan perhitungan ephemeris: " + error.message);
        }
    };

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        runCalculation();
    });

    // Auto: hitung maghrib hari ini saat halaman dibuka & saat lokasi berubah
    updateTimezone(defaultLat, defaultLng).then(runCalculation);
});
