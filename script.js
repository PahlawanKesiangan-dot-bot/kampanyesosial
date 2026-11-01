/* ==========================================================================
   KEMBARA LITERASI — DARK/LIGHT MODE, WEB PHOTO FETCHER & INTERACTIVE ENGINE
   100% Pure Vanilla JavaScript (Tanpa Library Eksternal)
   ========================================================================== */

(() => {
  'use strict';

  // --- 1. SISTEM TEMA DARK MODE & LIGHT MODE ---
  const THEME_STORAGE_KEY = 'kembara_theme_pref_v1';
  const htmlRoot = document.documentElement;
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const themeLabel = document.getElementById('theme-label');

  function getInitialTheme() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  let currentTheme = getInitialTheme();

  function applyTheme(theme, shouldRedrawCanvas = false) {
    currentTheme = theme;
    htmlRoot.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (_) {}

    if (theme === 'dark') {
      themeIcon.textContent = '☀️';
      themeLabel.textContent = 'Mode Terang';
    } else {
      themeIcon.textContent = '🌙';
      themeLabel.textContent = 'Mode Gelap';
    }

    if (shouldRedrawCanvas) {
      redrawSignature();
      renderMapPinsAndTabs();
    }
  }

  btnThemeToggle.addEventListener('click', () => {
    applyTheme(currentTheme === 'light' ? 'dark' : 'light', true);
  });

  // --- 2. PENGAMBIL FOTO DOKUMENTER DARI INTERNET (WIKIMEDIA COMMONS API) ---
  const photoCache = JSON.parse(sessionStorage.getItem('kembara_web_photos_v1') || '{}');

  function savePhotoCache() {
    try {
      sessionStorage.setItem('kembara_web_photos_v1', JSON.stringify(photoCache));
    } catch (_) {}
  }

  function createFallbackSvgUri(label) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360">
      <rect width="600" height="360" fill="#1E293B"/>
      <circle cx="480" cy="90" r="45" fill="#F97316" opacity="0.8"/>
      <path d="M0 260 Q150 220 300 260 T600 260 L600 360 L0 360 Z" fill="#0F172A"/>
      <text x="30" y="320" fill="#CBD5E1" font-family="sans-serif" font-size="18" font-weight="bold">${label}</text>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  async function queryWikimediaImage(query, pickIdx = 0) {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query + ' filetype:bitmap')}&gsrnamespace=6&gsrlimit=6&prop=imageinfo&iiprop=url&iiurlwidth=900&format=json&origin=*`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Network error');
    const data = await res.json();
    if (!data.query || !data.query.pages) return null;

    const valid = Object.values(data.query.pages)
      .filter(p => p.imageinfo && p.imageinfo[0] && p.imageinfo[0].thumburl)
      .filter(p => !/\.(svg|pdf|gif|djvu)$/i.test(p.title));

    if (valid.length === 0) return null;
    const item = valid[pickIdx % valid.length];
    return {
      url: item.imageinfo[0].thumburl,
      pageUrl: item.imageinfo[0].descriptionurl || 'https://commons.wikimedia.org',
      title: item.title.replace(/^File:/i, '').replace(/\.[^.]+$/, '').replace(/_/g, ' ')
    };
  }

  async function fetchInternetPhoto(cacheKey, primaryQuery, fallbackQuery, pickIdx = 0) {
    if (photoCache[cacheKey]) return photoCache[cacheKey];
    try {
      let found = await queryWikimediaImage(primaryQuery, pickIdx);
      if (!found && fallbackQuery) found = await queryWikimediaImage(fallbackQuery, pickIdx);
      if (found) {
        photoCache[cacheKey] = found;
        savePhotoCache();
        return found;
      }
    } catch (_) {}
    return null;
  }

  // Muat Foto Hero Utama dari Internet
  async function loadHeroPhoto() {
    const heroImg = document.getElementById('hero-web-img');
    const heroSkel = document.getElementById('hero-img-skeleton');
    const heroCredit = document.getElementById('hero-photo-credit');

    const res = await fetchInternetPhoto(
      'hero_children_reading',
      'Indonesian school children reading book',
      'Elementary school students Indonesia',
      0
    );

    if (res && res.url) {
      heroImg.onload = () => heroSkel.classList.add('hidden');
      heroImg.onerror = () => {
        heroImg.src = createFallbackSvgUri('Dokumentasi Literasi Pesisir Nusantara');
        heroSkel.classList.add('hidden');
      };
      heroImg.src = res.url;
      heroCredit.href = res.pageUrl;
      heroCredit.textContent = '📷 Wikimedia Commons';
    } else {
      heroImg.src = createFallbackSvgUri('Dokumentasi Literasi Pesisir Nusantara');
      heroSkel.classList.add('hidden');
    }
  }

  // --- 3. DATA 5 PULAU EKSPEDISI 3T (DENGAN KATA KUNCI FOTO INTERNET) ---
  const ISLAND_POSTS = [
    {
      id: 'sabu',
      code: 'POS #NTT-02',
      name: 'Pulau Sabu & Rote, NTT',
      shortName: 'Pulau Sabu (NTT)',
      coords: '10°30\' LS, 121°50\' BT',
      x: 586,
      y: 378,
      urgency: 'Krisis Buku Cerita',
      webQuery: 'Sabu Raijua East Nusa Tenggara coast',
      fallbackQuery: 'Rote Island beach boat Indonesia',
      childName: 'Marthen Dima (11 thn) — SD di Seba',
      letter: '“Buku dongeng hewan laut di pojok kelas kami sampulnya sudah lepas. Kalau hujan turun merembes dari atap, kami cepat-cepat menyimpan buku itu di dalam tas supaya kertasnya tidak basah.”',
      bottleneck: 'Kapal perintis bersandar 2 minggu sekali. Saat gelombang tinggi musim angin barat di Laut Sawu, pengiriman paket buku sering tertunda hingga sebulan.',
      neededBooks: [
        { category: 'Buku Cerita Sains Bergambar', needed: '340 Buku' },
        { category: 'Atlas Kepulauan & Bahari', needed: '120 Buku' },
        { category: 'Kamus Bergambar Anak', needed: '185 Buku' }
      ]
    },
    {
      id: 'misool',
      code: 'POS #PBD-07',
      name: 'Kepulauan Misool, Papua Barat Daya',
      shortName: 'Misool (Papua)',
      coords: '01°52\' LS, 130°06\' BT',
      x: 756,
      y: 226,
      urgency: 'Prioritas Perahu',
      webQuery: 'Misool Raja Ampat village boat',
      fallbackQuery: 'Raja Ampat wooden jetty Papua',
      childName: 'Yuliana (10 thn) — Kampung Yellu',
      letter: '“Kami mendayung sampan menyeberang selat kecil setiap pagi ke sekolah. Saya ingin sekali membaca buku tentang bintang dan planet karena langit malam di dermaga kami sangat cerah.”',
      bottleneck: 'Tidak ada kurir reguler langsung ke kampung pesisir; muatan dari Sorong harus dilanjutkan dengan perahu motor panjang berlapis terpal tahan air laut.',
      neededBooks: [
        { category: 'Ensiklopedia Alam & Astronomi', needed: '290 Buku' },
        { category: 'Buku Bacaan Berjenjang SD', needed: '410 Buku' },
        { category: 'Buku Mengenal Satwa Papua', needed: '160 Buku' }
      ]
    },
    {
      id: 'haruku',
      code: 'POS #MLK-04',
      name: 'Pulau Haruku, Maluku Tengah',
      shortName: 'P. Haruku (Maluku)',
      coords: '03°34\' LS, 128°29\' BT',
      x: 694,
      y: 254,
      urgency: 'Butuh Buku Sains',
      webQuery: 'Haruku Island Maluku boat',
      fallbackQuery: 'Maluku Islands coastal village',
      childName: 'Aletha (12 thn) — Negeri Haruku',
      letter: '“Di rumah baca bawah pohon kenari, kami berkumpul setiap sore sepulang membantu orang tua. Kami sangat menantikan buku eksperimen IPA sederhana dan kisah cerita rakyat.”',
      bottleneck: 'Tarif kargo ekspedisi swasta dari Jawa menembus Rp 68.000/kg, membuat banyak donatur buku perorangan batal mengirim bantuan.',
      neededBooks: [
        { category: 'Buku Eksperimen Sains Terapan', needed: '220 Buku' },
        { category: 'Sastra Anak & Cerita Rakyat', needed: '310 Buku' },
        { category: 'Buku Ekologi Laut & Karang', needed: '145 Buku' }
      ]
    },
    {
      id: 'natuna',
      code: 'POS #KPR-01',
      name: 'Pulau Laut, Kepulauan Natuna',
      shortName: 'Natuna Utara',
      coords: '04°42\' LU, 107°58\' BT',
      x: 252,
      y: 118,
      urgency: 'Perbatasan Utara',
      webQuery: 'Natuna Islands coast Indonesia',
      fallbackQuery: 'Natuna sea rocks boat',
      childName: 'Fikri Ramadhan (9 thn) — Air Payang',
      letter: '“Kalau musim angin utara datang dan ombak tinggi, kami tidak bisa bermain di pantai. Semua anak berkumpul di teras kayu membaca buku cerita yang sama bergantian.”',
      bottleneck: 'Terletak di perbatasan paling utara dengan jadwal pelayaran kapal perintis melingkar 4 sampai 6 hari dari Tanjungpinang.',
      neededBooks: [
        { category: 'Dongeng Nusantara Bergambar', needed: '275 Buku' },
        { category: 'Buku Matematika & Logika Visual', needed: '190 Buku' },
        { category: 'Ensiklopedia Kapal & Samudra', needed: '150 Buku' }
      ]
    },
    {
      id: 'talaud',
      code: 'POS #SLU-09',
      name: 'Pulau Miangas & Talaud, Sulut',
      shortName: 'Kep. Talaud',
      coords: '04°15\' LU, 126°48\' BT',
      x: 642,
      y: 96,
      urgency: 'Tepi Pasifik',
      webQuery: 'Talaud Islands North Sulawesi',
      fallbackQuery: 'North Sulawesi island harbor',
      childName: 'Gracia (11 thn) — Melonguane',
      letter: '“Pulau kami berada jauh di utara berbatasan langsung dengan Filipina. Saat peti buku dari kapal dibuka kemarin, teman-teman sangat gembira melihat buku ensiklopedia berwarna.”',
      bottleneck: 'Ombak terbuka Samudra Pasifik menuntut pengemasan kedap udara ekstra agar kertas buku tidak lembap selama belasan hari perjalanan laut.',
      neededBooks: [
        { category: 'Ensiklopedia Pengetahuan Umum', needed: '320 Buku' },
        { category: 'Komik Edukasi & Novel Anak', needed: '280 Buku' },
        { category: 'Buku Keterampilan Kreatif', needed: '130 Buku' }
      ]
    }
  ];

  // --- STATE LOKAL & PENYIMPANAN LOCALSTORAGE ---
  const STORAGE_KEY_SIGNERS = 'kembara_literasi_signers_v2';
  const STORAGE_KEY_BOOKS = 'kembara_literasi_pledged_books_v2';

  const defaultSigners = [
    { name: 'Nadia Kusumawardhani', city: 'Surabaya', serial: '#3842', time: 'Hari ini' },
    { name: 'Hendrikus Lerrick', city: 'Kupang', serial: '#3841', time: 'Hari ini' },
    { name: 'dr. Arief Budiman', city: 'Makassar', serial: '#3840', time: 'Kemarin' },
    { name: 'Siti Nurhaliza Putri', city: 'Sidoarjo', serial: '#3839', time: 'Kemarin' }
  ];

  let signersList = [];
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_SIGNERS));
    signersList = Array.isArray(saved) && saved.length > 0 ? saved : defaultSigners;
  } catch (_) {
    signersList = defaultSigners;
  }

  let extraBooksPledged = parseInt(localStorage.getItem(STORAGE_KEY_BOOKS) || '0', 10) || 0;
  let activeIsland = ISLAND_POSTS[0];
  let islandPhotoToken = 0;

  // Tanggal Hari Ini
  const dateEl = document.getElementById('live-expedition-date');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  function updateGlobalCounters() {
    const baseSigners = 3838 + signersList.length;
    const baseBooks = 11420 + extraBooksPledged;
    const tonnage = (4.86 + extraBooksPledged * 0.00038).toFixed(2).replace('.', ',');

    document.getElementById('metric-books-sent').textContent = baseBooks.toLocaleString('id-ID');
    document.getElementById('metric-tonnage').textContent = tonnage;
    document.getElementById('metric-petitions').textContent = baseSigners.toLocaleString('id-ID');
    document.getElementById('registry-total-count').textContent = baseSigners.toLocaleString('id-ID');
    document.getElementById('signer-next-number').textContent = `Urutan #${baseSigners + 1}`;

    const pct = Math.min(100, (baseSigners / 5000) * 100).toFixed(1);
    document.getElementById('registry-progress-fill').style.width = `${pct}%`;
  }

  // --- 4. PETA EKSPEDISI INTERAKTIF ---
  const pinsLayer = document.getElementById('map-pins-layer');
  const quickTabsContainer = document.getElementById('island-quick-tabs');
  const mapCamera = document.getElementById('map-camera-group');

  function renderMapPinsAndTabs() {
    pinsLayer.innerHTML = '';
    quickTabsContainer.innerHTML = '';

    const accentHex = currentTheme === 'dark' ? '#F97316' : '#C84B31';
    const pinBg = currentTheme === 'dark' ? '#0F172A' : '#1E293B';

    ISLAND_POSTS.forEach((post) => {
      const isSelected = post.id === activeIsland.id;
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', `island-pin-group ${isSelected ? 'active' : ''}`);
      g.setAttribute('transform', `translate(${post.x}, ${post.y})`);
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', `Pilih ${post.name}`);

      g.innerHTML = `
        <circle class="pin-ripple" cx="0" cy="0" r="13"></circle>
        <circle cx="0" cy="0" r="${isSelected ? 9 : 7}" fill="${isSelected ? accentHex : pinBg}" stroke="#FFFFFF" stroke-width="2"></circle>
        <rect x="-46" y="13" width="92" height="19" rx="5" fill="${pinBg}" fill-opacity="0.92"></rect>
        <text x="0" y="26" text-anchor="middle" fill="#FFFFFF" font-size="10" font-weight="600">${post.shortName}</text>
      `;

      g.addEventListener('click', () => selectIsland(post.id, true));
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectIsland(post.id, true);
        }
      });
      pinsLayer.appendChild(g);

      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = `island-tab-btn ${isSelected ? 'active' : ''}`;
      tab.textContent = post.shortName;
      tab.addEventListener('click', () => selectIsland(post.id, true));
      quickTabsContainer.appendChild(tab);
    });
  }

  async function selectIsland(islandId, zoomFocus = false) {
    const found = ISLAND_POSTS.find((p) => p.id === islandId);
    if (!found) return;
    activeIsland = found;
    const token = ++islandPhotoToken;

    document.getElementById('map-coord-readout').textContent = `Koordinat: ${found.coords}`;
    document.getElementById('log-code').textContent = `${found.code} • ${found.coords}`;
    document.getElementById('log-island-name').textContent = found.name;
    document.getElementById('log-urgency').textContent = found.urgency;
    document.getElementById('log-letter-text').textContent = found.letter;
    document.getElementById('log-child-author').textContent = `— ${found.childName}`;
    document.getElementById('log-bottleneck-text').textContent = found.bottleneck;

    const listEl = document.getElementById('log-needed-list');
    listEl.innerHTML = '';
    found.neededBooks.forEach((b) => {
      const li = document.createElement('li');
      li.innerHTML = `<span>${b.category}</span><span class="qty-tag">Kurang ${b.needed}</span>`;
      listEl.appendChild(li);
    });

    document.getElementById('calc-dest-label').textContent = found.name;
    updateCalculatorView();
    renderMapPinsAndTabs();

    if (zoomFocus) {
      const scale = 1.28;
      const tx = Math.max(-280, Math.min(0, 500 - found.x * scale));
      const ty = Math.max(-130, Math.min(0, 230 - found.y * scale));
      mapCamera.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    }

    // Ambil Foto Pulau Terkait dari Internet
    const islandImg = document.getElementById('island-web-img');
    const islandSkel = document.getElementById('island-img-skeleton');
    const islandCredit = document.getElementById('island-photo-credit');

    islandSkel.classList.remove('hidden');
    const photo = await fetchInternetPhoto('island_' + found.id, found.webQuery, found.fallbackQuery, 0);
    if (token !== islandPhotoToken) return;

    if (photo && photo.url) {
      islandImg.onload = () => {
        if (token === islandPhotoToken) islandSkel.classList.add('hidden');
      };
      islandImg.onerror = () => {
        islandImg.src = createFallbackSvgUri(found.name);
        islandSkel.classList.add('hidden');
      };
      islandImg.src = photo.url;
      islandCredit.href = photo.pageUrl;
      islandCredit.textContent = `📷 ${photo.title.slice(0, 28)}`;
    } else {
      islandImg.src = createFallbackSvgUri(found.name);
      islandSkel.classList.add('hidden');
    }
  }

  document.getElementById('btn-map-reset').addEventListener('click', () => {
    mapCamera.style.transform = 'translate(0px, 0px) scale(1)';
  });

  document.getElementById('btn-ship-to-island').addEventListener('click', () => {
    document.getElementById('kalkulator-dampak').scrollIntoView({ behavior: 'smooth' });
  });

  // --- 5. KALKULATOR KONVERSI GAYA HIDUP ---
  const sliderEl = document.getElementById('donation-slider');
  const presetBtns = document.querySelectorAll('.preset-btn');
  const bookStackEl = document.getElementById('visual-book-stack');
  const drybagIndicator = document.getElementById('drybag-indicator');

  const SPINE_COLORS = ['#C84B31', '#0D9488', '#2563EB', '#D97706', '#4F46E5', '#059669'];
  const SPINE_TITLES = [
    'Ensiklopedia Samudra',
    'Cerita Rakyat Nusantara',
    'Atlas Bintang & Planet',
    'Sains Bergambar Dasar',
    'Dongeng Hutan Tropis',
    'Kamus Visual Pelajar',
    'Kisah Penjelajah Laut',
    'Matematika Menyenangkan'
  ];

  function getLifestyleTier(amount, destName) {
    if (amount < 45000) {
      return {
        urbanEq: 'Setara 1 gelas minuman boba manis',
        books: 1,
        packageDesc: `Mengirimkan 1 Buku Dongeng Bergambar sampul tebal berlaminasi ke ${destName}.`,
        protection: 'Plastik Segel Kedap Air',
        hasDryBag: false
      };
    }
    if (amount < 110000) {
      const books = Math.max(2, Math.floor(amount / 30000));
      return {
        urbanEq: 'Setara 1 tiket bioskop akhir pekan',
        books,
        packageDesc: `Mengirimkan ${books} Buku Ensiklopedia Sains Pemula + subsidi ongkir kapal perintis ke ${destName}.`,
        protection: 'Kardus Lapis Pelindung Garam',
        hasDryBag: false
      };
    }
    if (amount < 250000) {
      const books = Math.floor(amount / 28000);
      return {
        urbanEq: 'Setara sekali nongkrong di kafe',
        books,
        packageDesc: `1 Paket Mini-Pustaka (${books} Buku Bacaan + Tas Tahan Air Laut untuk dibawa anak berperahu ke ${destName}).`,
        protection: 'Tas Dry-Bag Tahan Air Laut',
        hasDryBag: true
      };
    }
    const books = Math.floor(amount / 26000);
    return {
      urbanEq: 'Setara 1 kemeja kasual mal',
      books,
      packageDesc: `1 Peti Pustaka Dermaga (${books} Buku Referensi & Cerita + 2 Tas Dry-Bag Perahu + Kargo Penuh ke ${destName}).`,
      protection: 'Peti Kayu + Dry-Bag Laut',
      hasDryBag: true
    };
  }

  function updateCalculatorView() {
    const val = parseInt(sliderEl.value, 10);
    const tier = getLifestyleTier(val, activeIsland.shortName);
    const childrenImpacted = tier.books * 16;
    const weightKg = (tier.books * 0.42).toFixed(2).replace('.', ',');

    document.getElementById('calc-amount-text').textContent = 'Rp ' + val.toLocaleString('id-ID');
    document.getElementById('calc-urban-badge').textContent = tier.urbanEq;
    document.getElementById('calc-package-desc').textContent = tier.packageDesc;
    document.getElementById('calc-books-count').textContent = `${tier.books} Buku Fisik`;
    document.getElementById('calc-cargo-weight').textContent = `${weightKg} Kg`;
    document.getElementById('calc-waterproof-stat').textContent = tier.protection;

    document.getElementById('calc-children-impact').textContent = `${childrenImpacted} Anak Pesisir`;
    const pct = Math.min(100, Math.round((childrenImpacted / 300) * 100));
    document.getElementById('calc-meter-fill').style.width = `${pct}%`;

    drybagIndicator.classList.toggle('hidden', !tier.hasDryBag);

    presetBtns.forEach((btn) => {
      btn.classList.toggle('active', parseInt(btn.dataset.val, 10) === val);
    });

    const visibleSpines = Math.min(9, tier.books);
    bookStackEl.innerHTML = '';
    for (let i = 0; i < visibleSpines; i++) {
      const spine = document.createElement('div');
      spine.className = 'book-spine';
      spine.style.width = `${84 + ((i * 5) % 16)}%`;
      spine.style.backgroundColor = SPINE_COLORS[i % SPINE_COLORS.length];
      spine.innerHTML = `<span>${SPINE_TITLES[i % SPINE_TITLES.length]}</span><span>#${i + 1}</span>`;
      bookStackEl.appendChild(spine);
    }
    if (tier.books > 9) {
      const extra = document.createElement('div');
      extra.className = 'book-spine';
      extra.style.width = '92%';
      extra.style.backgroundColor = '#334155';
      extra.innerHTML = `<span>+ ${tier.books - 9} Buku Lainnya dalam Paket</span><span>Kargo</span>`;
      bookStackEl.appendChild(extra);
    }
  }

  sliderEl.addEventListener('input', () => {
    document.getElementById('donation-feedback').textContent = '';
    updateCalculatorView();
  });

  presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      sliderEl.value = btn.dataset.val;
      document.getElementById('donation-feedback').textContent = '';
      updateCalculatorView();
    });
  });

  document.getElementById('btn-commit-donation').addEventListener('click', () => {
    const val = parseInt(sliderEl.value, 10);
    const tier = getLifestyleTier(val, activeIsland.shortName);
    extraBooksPledged += tier.books;
    try {
      localStorage.setItem(STORAGE_KEY_BOOKS, String(extraBooksPledged));
    } catch (_) {}

    updateGlobalCounters();
    const code = 'KL-' + Math.floor(1000 + Math.random() * 8999);
    document.getElementById('donation-feedback').textContent =
      `✓ Komitmen #${code} tercatat: ${tier.books} buku dijadwalkan menuju ${activeIsland.shortName}.`;
  });

  // --- 6. KANVAS PETISI TANDA TANGAN (ADAPTIF WARNA TINTA TERANG/GELAP) ---
  const sigCanvas = document.getElementById('signature-canvas');
  const sigCtx = sigCanvas.getContext('2d');
  const padBox = document.getElementById('canvas-pad-box');
  const rubberStampEl = document.getElementById('verified-rubber-stamp');
  const errorEl = document.getElementById('petition-error');

  let strokes = [];
  let currentStroke = null;
  let isDrawing = false;

  function resizeSignatureCanvas() {
    const rect = padBox.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    sigCanvas.width = Math.floor(rect.width * dpr);
    sigCanvas.height = Math.floor(rect.height * dpr);
    sigCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redrawSignature();
  }

  function redrawSignature() {
    const w = padBox.clientWidth;
    const h = padBox.clientHeight;
    sigCtx.clearRect(0, 0, w, h);

    // Tinta otomatis terang di Dark Mode dan gelap di Light Mode agar selalu terbaca jelas
    sigCtx.strokeStyle = currentTheme === 'dark' ? '#F8FAFC' : '#0F172A';
    sigCtx.lineWidth = 2.5;
    sigCtx.lineCap = 'round';
    sigCtx.lineJoin = 'round';

    strokes.forEach((stroke) => {
      if (stroke.length < 2) return;
      sigCtx.beginPath();
      sigCtx.moveTo(stroke[0].nx * w, stroke[0].ny * h);
      for (let i = 1; i < stroke.length - 1; i++) {
        const midX = ((stroke[i].nx + stroke[i + 1].nx) / 2) * w;
        const midY = ((stroke[i].ny + stroke[i + 1].ny) / 2) * h;
        sigCtx.quadraticCurveTo(stroke[i].nx * w, stroke[i].ny * h, midX, midY);
      }
      const last = stroke[stroke.length - 1];
      sigCtx.lineTo(last.nx * w, last.ny * h);
      sigCtx.stroke();
    });
  }

  function getPoint(clientX, clientY) {
    const rect = sigCanvas.getBoundingClientRect();
    return {
      nx: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      ny: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
    };
  }

  function startStroke(cx, cy) {
    rubberStampEl.classList.add('hidden');
    errorEl.textContent = '';
    isDrawing = true;
    const pt = getPoint(cx, cy);
    currentStroke = [pt, { nx: pt.nx + 0.001, ny: pt.ny + 0.001 }];
    strokes.push(currentStroke);
    redrawSignature();
  }

  function moveStroke(cx, cy) {
    if (!isDrawing || !currentStroke) return;
    currentStroke.push(getPoint(cx, cy));
    redrawSignature();
  }

  function endStroke() {
    isDrawing = false;
    currentStroke = null;
  }

  sigCanvas.addEventListener('mousedown', (e) => startStroke(e.clientX, e.clientY));
  window.addEventListener('mousemove', (e) => moveStroke(e.clientX, e.clientY));
  window.addEventListener('mouseup', endStroke);

  sigCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches[0]) startStroke(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });

  sigCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches[0]) moveStroke(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });

  sigCanvas.addEventListener('touchend', endStroke);

  document.getElementById('btn-clear-canvas').addEventListener('click', () => {
    strokes = [];
    rubberStampEl.classList.add('hidden');
    redrawSignature();
  });

  window.addEventListener('resize', resizeSignatureCanvas);

  function renderSignerRegistry() {
    const listEl = document.getElementById('signer-ledger-list');
    listEl.innerHTML = '';

    signersList.slice(0, 12).forEach((s) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="signer-info">
          <strong>${s.name}</strong>
          <span>${s.city} &bull; ${s.time}</span>
        </div>
        <span class="signer-tag">Sah ${s.serial}</span>
      `;
      listEl.appendChild(li);
    });
  }

  // Unduh Kartu Relawan Literasi (.PNG) dengan Font Sans-Serif Bersih
  function downloadVolunteerCard(name, city, serialNo) {
    const cardCanvas = document.createElement('canvas');
    cardCanvas.width = 860;
    cardCanvas.height = 480;
    const ctx = cardCanvas.getContext('2d');

    ctx.fillStyle = currentTheme === 'dark' ? '#0F172A' : '#FFFFFF';
    ctx.fillRect(0, 0, 860, 480);

    ctx.strokeStyle = '#F97316';
    ctx.lineWidth = 6;
    ctx.strokeRect(20, 20, 820, 440);

    ctx.fillStyle = '#C84B31';
    ctx.fillRect(20, 20, 820, 82);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('KARTU RELAWAN KEMBARA LITERASI NUSANTARA', 48, 70);

    const textMain = currentTheme === 'dark' ? '#F8FAFC' : '#0F172A';
    const textSub = currentTheme === 'dark' ? '#94A3B8' : '#64748B';

    ctx.fillStyle = textSub;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('NOMOR REGISTRASI PETISI', 48, 145);
    ctx.fillText('NAMA LENGKAP RELAWAN', 48, 215);
    ctx.fillText('KOTA ASAL', 48, 285);
    ctx.fillText('TITIK PULAU DUKUNGAN', 48, 355);

    ctx.fillStyle = '#F97316';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(serialNo, 48, 172);

    ctx.fillStyle = textMain;
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(name, 48, 244);
    ctx.font = '20px sans-serif';
    ctx.fillText(city, 48, 312);
    ctx.fillText(activeIsland.name, 48, 382);

    // Kotak Tanda Tangan
    ctx.fillStyle = currentTheme === 'dark' ? '#1E293B' : '#F8FAFC';
    ctx.fillRect(490, 135, 315, 190);
    ctx.strokeStyle = textSub;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(490, 135, 315, 190);

    ctx.strokeStyle = textMain;
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    strokes.forEach((st) => {
      if (st.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(506 + st[0].nx * 280, 150 + st[0].ny * 155);
      for (let i = 1; i < st.length; i++) {
        ctx.lineTo(506 + st[i].nx * 280, 150 + st[i].ny * 155);
      }
      ctx.stroke();
    });

    ctx.fillStyle = '#10B981';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('✓ TANDA TANGAN SAH & TERVERIFIKASI', 506, 365);

    const link = document.createElement('a');
    link.download = `kartu-relawan-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
    link.href = cardCanvas.toDataURL('image/png');
    link.click();
  }

  document.getElementById('petition-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('volunteer-name');
    const cityInput = document.getElementById('volunteer-city');
    const nameVal = nameInput.value.trim();
    const cityVal = cityInput.value.trim();

    if (!nameVal || !cityVal) {
      errorEl.textContent = 'Mohon isi Nama Lengkap dan Kota Asal terlebih dahulu.';
      return;
    }
    if (strokes.length === 0) {
      errorEl.textContent = 'Mohon goreskan tanda tangan Anda pada kotak kanvas.';
      return;
    }

    errorEl.textContent = '';
    const serialNumber = `#${3838 + signersList.length + 1}`;
    const dateStamp = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

    document.getElementById('stamp-date-code').textContent = `${serialNumber} • ${dateStamp}`;
    rubberStampEl.classList.remove('hidden');

    signersList.unshift({
      name: nameVal,
      city: cityVal,
      serial: serialNumber,
      time: `Baru saja (${dateStamp})`
    });

    try {
      localStorage.setItem(STORAGE_KEY_SIGNERS, JSON.stringify(signersList));
    } catch (_) {}

    renderSignerRegistry();
    updateGlobalCounters();
    downloadVolunteerCard(nameVal, cityVal, serialNumber);

    nameInput.value = '';
    cityInput.value = '';
  });

  // --- JALANKAN INISIALISASI ---
  applyTheme(currentTheme, false);
  loadHeroPhoto();
  selectIsland('sabu', false);
  updateCalculatorView();
  renderSignerRegistry();
  updateGlobalCounters();
  requestAnimationFrame(resizeSignatureCanvas);
})();