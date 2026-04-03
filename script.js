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
    let defaultLat = -6.200000;
    let defaultLng = 106.816666;

    const map = L.map('map', {
        attributionControl: false
    }).setView([defaultLat, defaultLng], 5);

    // Using CartoDB Positron tiles for a 'regular' light appearance while avoiding OSM's strict Referer policy
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

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

    // Initial check for Jakarta
    updateTimezone(defaultLat, defaultLng);

    // 2. Add Search Box (Geocoder)
    const geocoder = L.Control.geocoder({
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
            updateTimezone(latlng.lat, latlng.lng);
        })
        .addTo(map);

    // Sync input with Map
    const inputLat = document.getElementById('lat-input');
    const inputLng = document.getElementById('lng-input');

    // 2. Initialize Flatpickr for Date/Time Input
    const fp = flatpickr("#date-input", {
        enableTime: true,
        dateFormat: "d/m/Y H:i", // dd/mm/yyyy 24 hour format
        time_24hr: true,
        locale: "id", // Use Indonesian locale
        defaultDate: new Date(),
        allowInput: true, // Let users type manually
        disableMobile: true // Force Flatpickr UI on mobile to keep keyboard accessible
    });

    inputLat.value = defaultLat.toFixed(6);
    inputLng.value = defaultLng.toFixed(6);

    // Update form when marker is dragged
    marker.on('dragend', function (e) {
        const coord = marker.getLatLng();
        inputLat.value = coord.lat.toFixed(6);
        inputLng.value = coord.lng.toFixed(6);
        lastLocationName = `Titik Koordinat (${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)})`;
        updateTimezone(coord.lat, coord.lng);
    });

    // Update map when map is clicked
    map.on('click', function (e) {
        marker.setLatLng(e.latlng);
        inputLat.value = e.latlng.lat.toFixed(6);
        inputLng.value = e.latlng.lng.toFixed(6);
        lastLocationName = `Titik Koordinat (${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)})`;
        updateTimezone(e.latlng.lat, e.latlng.lng);
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

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const lat = parseFloat(inputLat.value);
        const lng = parseFloat(inputLng.value);

        // Priority: try parsing the current raw input value first to capture manual typing
        const rawDateStr = document.getElementById('date-input').value;
        let dateObj = fp.parseDate(rawDateStr, "d/m/Y H:i");

        if (isNaN(lat) || isNaN(lng) || !dateObj) {
            alert("Harap isi koordinat dan waktu dengan benar! (Format: dd/mm/yyyy HH:mm)");
            return;
        }

        // --- TIMEZONE ADJUSTMENT FOR INPUT ---
        // Treat input date/time as being in currentTargetzone
        const isoString = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')}T${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}:00`;
        // Append currentUtcOffset (e.g., "+03:00")
        const dateObjInTarget = new Date(`${isoString}${currentUtcOffset}`);

        if (!isNaN(dateObjInTarget.getTime())) {
            dateObj = dateObjInTarget;
        }

        try {
            if (typeof Astronomy === 'undefined') {
                throw new Error("Library Astronomy Engine tidak dapat dimuat.");
            }

            const observer = new Astronomy.Observer(lat, lng, 0);

            // Find sunset for the given date and location
            let startOfDay = new Date(dateObj);
            startOfDay.setHours(0, 0, 0, 0);
            // Note: startOfDay here is in local user time, but we just need a starting point for SearchRiseSet
            let timeSearchStart = Astronomy.MakeTime(startOfDay);

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
                calcTime = dateObj;
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
    });
});
