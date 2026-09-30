# Prediksi Hilal 🌙

Aplikasi web modern dan elegan untuk menghitung prediksi penampakan hilal (bulan sabit muda) secara astronomis di seluruh dunia. Aplikasi ini dirancang untuk memberikan informasi akurat mengenai parameter visibilitas bulan untuk membantu penentuan awal bulan kamariah.

## ✨ Fitur Utama

- **🚀 Perhitungan Astronomis Akurat**: Menghitung Ketinggian Bulan (*Altitude*), Jarak Sudut (*Elongation*), dan Umur Bulan sejak konjungsi menggunakan *Astronomy Engine*.
- **📍 Peta Interaktif**: Dilengkapi dengan Leaflet.js untuk pemilihan lokasi pengamatan secara visual dengan presisi tinggi.
- **🔍 Geocoding (Pencarian Lokasi)**: Fitur cari lokasi untuk memudahkan pengguna menemukan koordinat kota atau tempat tertentu.
- **🌅 Deteksi Waktu Terbenam Otomatis**: Secara otomatis menghitung parameter visibilitas tepat pada waktu Matahari terbenam (*ghurub*) di lokasi yang dipilih.
- **📊 Analisis Kriteria Visibilitas**:
  - **MABIMS (Baru)**: Referensi kriteria visibilitas yang digunakan di Indonesia, Malaysia, Brunei, dan Singapura (Elevasi > 3° & Elongasi > 6.4°).
  - **Wujudul Hilal**: Referensi kriteria berdasarkan posisi bulan di atas horizon saat matahari terbenam setelah terjadi konjungsi.
- **🎨 Desain Premium & Responsif**: Antarmuka modern dengan tema *Deep Space*, animasi halus, dan sepenuhnya responsif untuk perangkat mobile maupun desktop.

## 🛠️ Teknologi yang Digunakan

- **Struktur & Logika**: HTML5, Vanilla CSS3 (Custom Design System), dan JavaScript (ES6+).
- **Astronomy Logic**: [Astronomy Engine](https://github.com/cosinekitty/astronomypy) (Versi Browser) untuk efemeris benda langit.
- **Maps API**: [Leaflet.js](https://leafletjs.com/) dengan tiles dari Esri World Topo Map (fallback Esri World Street Map).
- **UI Components**: [Leaflet Control Geocoder](https://github.com/perliedman/leaflet-control-geocoder) untuk pencarian lokasi.
- **Typography**: Google Fonts (Outfit).

## 🚀 Cara Penggunaan

1. Kloning atau unduh repositori ini.
2. Buka file `index.html` pada browser favorit Anda.
3. Pilih lokasi di peta atau cari melalui kolom pencarian.
4. Hasil dihitung otomatis pada waktu matahari terbenam (ghurub) hari ini di lokasi tersebut; klik **"Hitung Ketinggian Bulan"** untuk menghitung ulang.

## 🧑‍💻 Pengembangan

`index.html` memuat `style.css` dan `script.js` dengan query versi (`?v=2`). Naikkan versinya setiap kali salah satu file itu diubah agar browser tidak memakai salinan lama dari cache (penting untuk deployment di GitHub Pages). File dari CDN tidak perlu, karena versinya sudah dipin di URL.

## 📝 Lisensi & Kredit

Dibuat dengan ❤️ oleh **Aditya Hanif** &copy; 2026.
Tujuan aplikasi ini adalah sebagai alat bantu edukasi dan simulasi astronomis. Keputusan resmi awal bulan tetap mengikuti hasil Isbat pemerintah/otoritas terkait.
