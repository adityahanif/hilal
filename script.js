document.addEventListener('DOMContentLoaded', () => {
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
        disableMobile: "true" // Force Flatpickr UI on mobile to keep keyboard accessible
    });

    inputLat.value = defaultLat.toFixed(6);
    inputLng.value = defaultLng.toFixed(6);

    // Update form when marker is dragged
    marker.on('dragend', function (e) {
        const coord = marker.getLatLng();
        inputLat.value = coord.lat.toFixed(6);
        inputLng.value = coord.lng.toFixed(6);
        lastLocationName = `Titik Koordinat (${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)})`;
    });

    // Update map when map is clicked
    map.on('click', function (e) {
        marker.setLatLng(e.latlng);
        inputLat.value = e.latlng.lat.toFixed(6);
        inputLng.value = e.latlng.lng.toFixed(6);
        lastLocationName = `Titik Koordinat (${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)})`;
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

        // Fallback to selectedDates if parsing failed (though usually parseDate is what we want)
        if (!dateObj) {
            dateObj = fp.selectedDates[0];
        } else {
            // Sync the picker to the parsed date so they stay aligned
            fp.setDate(dateObj, false);
        }

        if (isNaN(lat) || isNaN(lng) || !dateObj) {
            alert("Harap isi koordinat dan waktu dengan benar! (Format: dd/mm/yyyy HH:mm)");
            return;
        }

        try {
            // Check if library is loaded correctly
            if (typeof Astronomy === 'undefined') {
                throw new Error("Library Astronomy Engine tidak dapat dimuat. Pastikan Anda memiliki koneksi internet untuk memuat script dari CDN.");
            }

            const observer = new Astronomy.Observer(lat, lng, 0); // elevation 0m

            // First, find sunset for the given date and location
            // Search from start of day to ensure we catch today's sunset
            let startOfDay = new Date(dateObj);
            startOfDay.setHours(0, 0, 0, 0);
            let timeSearchStart = Astronomy.MakeTime(startOfDay);

            // -1 represents Sunset
            let sunsetEvent = Astronomy.SearchRiseSet('Sun', observer, -1, timeSearchStart, 2);

            let calcTime;
            let sunsetText = "--:--";

            if (sunsetEvent) {
                calcTime = sunsetEvent.date;
                let h = calcTime.getHours().toString().padStart(2, '0');
                let m = calcTime.getMinutes().toString().padStart(2, '0');
                sunsetText = `${h}:${m}`;
                valSunset.innerHTML = sunsetText;
                sunsetContainer.style.display = 'flex';

                // Update display with requested summary text
                const dateOptions = { day: 'numeric', month: 'long', year: 'numeric' };
                const timeOptions = { hour: '2-digit', minute: '2-digit' };

                const tanggalStr = calcTime.toLocaleDateString('id-ID', dateOptions);
                const waktuStr = calcTime.toLocaleTimeString('id-ID', timeOptions);

                hijriDisplay.textContent = `Hasil perhitungan bulan pada tanggal ${tanggalStr} pukul ${waktuStr} WIB (UTC +7) di ${lastLocationName} adalah:`;
                hijriDisplay.style.fontSize = "1rem"; // Keep it legible
                hijriDisplay.style.textAlign = "left"; // 
                hijriDisplay.style.marginTop = "0";
                hijriDisplay.style.color = "var(--secondary-color)";
            } else {
                // Extremes like poles, fallback to user inputted time
                calcTime = dateObj;
                sunsetContainer.style.display = 'none';

                const dateOptions = { day: 'numeric', month: 'long', year: 'numeric' };
                const timeOptions = { hour: '2-digit', minute: '2-digit' };
                const tanggalStr = calcTime.toLocaleDateString('id-ID', dateOptions);
                const waktuStr = calcTime.toLocaleTimeString('id-ID', timeOptions);

                hijriDisplay.textContent = `Hasil perhitungan bulan pada ${tanggalStr} pukul ${waktuStr} pada ${lastLocationName} adalah:`;
                hijriDisplay.style.fontSize = "1.1rem";
                hijriDisplay.style.textAlign = "center";
                hijriDisplay.style.marginTop = "0";
                hijriDisplay.style.color = "var(--secondary-color)";
            }

            const astroTime = Astronomy.MakeTime(calcTime);

            // 1. Calculate Altitude (Topocentric)
            const moonEqu = Astronomy.Equator('Moon', astroTime, observer, true, true);
            const moonHor = Astronomy.Horizon(astroTime, observer, moonEqu.ra, moonEqu.dec, 'normal');
            const altitude = moonHor.altitude;

            // 2. Calculate Elongation (Geocentric Angular Distance is standard for MABIMS)
            const moonGeo = Astronomy.GeoVector('Moon', astroTime, true);
            const sunGeo = Astronomy.GeoVector('Sun', astroTime, true);
            const elongation = Astronomy.AngleBetween(sunGeo, moonGeo);

            // 3. Moon Age (Umur Hilal in Hours - Exact)
            // Search backwards for the New Moon event (Phase 0) within the last 30 days
            const lastNewMoon = Astronomy.SearchMoonPhase(0, astroTime, -30);
            let ageHours = 0;
            if (lastNewMoon) {
                const ageDays = astroTime.date.getTime() - lastNewMoon.date.getTime();
                ageHours = ageDays / (1000 * 60 * 60);

                const conjDateStr = lastNewMoon.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                const conjTimeStr = lastNewMoon.date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                conjDisplay.textContent = `🌑 Waktu konjungsi (ijtimak) terjadi pada tanggal ${conjDateStr} pukul ${conjTimeStr} WIB (UTC +7).`;
                conjDisplay.style.display = "block";
                conjDisplay.style.textAlign = "left";
            } else {
                conjDisplay.style.display = "none";
            }

            // Animate Outputs
            animateValue(valAlt, 0, altitude, 1000, val => Math.abs(val) < 0.01 && val < 0 ? `-0.00°` : `${val.toFixed(2)}°`);
            animateValue(valElong, 0, elongation, 1000, val => `${val.toFixed(2)}°`);
            animateValue(valAge, 0, ageHours, 1000, val => `${val.toFixed(2)} Jam`);

            // Check Criteria
            let meetMabims = (altitude >= 3.0 && elongation >= 6.4);
            let meetWujudul = (ageHours > 0 && altitude > 0);

            // Update Badges UI
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
