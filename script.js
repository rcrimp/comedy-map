
const NZ_BOUNDS = L.latLngBounds(L.latLng(-48.0, 165.0), L.latLng(-33.5, 179.9));

const SAMPLE = [
    {
        name: "Waa! Haa! Club",
        pin_color: "#ef4444",
        image_url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1000&auto=format&fit=crop",
        lat: -41.27243008906332, lon: 173.2881214748602,
        address: "183 Bridge St, Nelson 7010",
        email: "",
        phone: "",
        facebook: ""
    },
    {
        name: "Good Times ?",
        pin_color: "#f59e0b",
        image_url: "https://goodtimescomedyclub.co.nz/wp-content/uploads/2020/09/cropped-logo.png",
        lat: -43.53654403512128, lon: 172.6393230342813,
        address: "224 Saint Asaph Street, Christchurch 8011",
        email: "hello@chch.nz",
        phone: "+64 4 555 9876",
        facebook: "https://facebook.com/welmicnight"
    },
    {
        name: "Weekly Wednesday",
        pin_color: "#10b981",
        image_url: "https://dunedincomedy.co.nz/uploads/wed_32047d3feb.jpg",
        lat: -45.854911697670886, lon: 170.51863942051915,
        address: "8 Bank Street, Dunedin 9010",
        email: "reubencrisp@gmail.com",
        phone: "+64 022 1234567",
        facebook: "https://facebook.com/dunedincomedy"
    },
    {
        name: "To The Moon",
        pin_color: "#3b82f6",
        image_url: "https://dunedincomedy.co.nz/uploads/moons_21d74fb0b8.jpg",
        lat: -45.87840580218641, lon: 170.50098247366807,
        address: "286 Princes Street, Dunedin, 9011",
        email: "test@email.com",
        phone: "+64 3 477 1234",
        facebook: "https://facebook.com/tothemoon"
    },
    {
        name: "Sweet Laughs",
        pin_color: "#8b5cf6",
        image_url: "https://dunedincomedy.co.nz/uploads/modaks_b1729a3d4b.jpg",
        lat: -45.86897945015506, lon: 170.50625038778537,
        address: "337-339 George Street, Dunedin 9016",
        email: "",
        phone: "",
        facebook: ""
    }
];

const qs = (sel, el=document) => el.querySelector(sel);
const qsa = (sel, el=document) => Array.from(el.querySelectorAll(sel));

const normalizeVenue = (raw, idx) => {
    const lat = parseFloat(raw.lat ?? raw.latitude);
    const lon = parseFloat(raw.lon ?? raw.lng ?? raw.longitude);
    return {
    id: String(raw.id ?? `${(raw.name || 'venue').toLowerCase().replace(/\s+/g,'-')}-${idx}`),
    name: String(raw.name || `Venue ${idx+1}`),
    pin_color: raw.pin_color ?? raw.pinColour ?? raw.pin_colour ?? "#2563eb",
    image_url: raw.image_url || raw.imageUrl || "",
    lat, lon,
    address: raw.address || "",
    email: raw.email || "",
    phone: raw.phone || "",
    facebook: raw.facebook || raw.fb || "",
    };
};

const buildGMapsLink = (v) => {
    const q = v.address && v.address.trim().length > 0 ? encodeURIComponent(v.address) : `${v.lat},${v.lon}`;
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
};

// --- State ---
let venues = SAMPLE.map(normalizeVenue);
let filtered = venues.slice();
let selectedId = null;

const map = L.map('map', {
    zoomControl: true,
    maxBounds: NZ_BOUNDS,
    maxBoundsViscosity: 1.0,
    minZoom: 5, // Minimum zoom level allowed
}).fitBounds(NZ_BOUNDS.pad(-0.35));

L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
}).addTo(map);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
	// attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
	subdomains: 'abcd',
	// maxZoom: 20
}).addTo(map);

// L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//     attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
// }).addTo(map);

// Marker store
const markerById = new Map();

const markerIcon = (color, selected=false) => L.divIcon({
    className: '',
    html: `<div class="pin ${selected ? 'selected' : ''}" style="--c:${color || '#2563eb'}"></div>`,
    iconSize: [24, 30],
    iconAnchor: [12, 26],
    popupAnchor: [0, -24]
});

function renderMarkers() {
    // Remove markers that are no longer in filtered
    const validIds = new Set(filtered.map(v => v.id));
    for (const [id, m] of markerById.entries()) {
    if (!validIds.has(id)) { map.removeLayer(m); markerById.delete(id); }
    }
    // Add/update markers
    filtered.forEach(v => {
    let m = markerById.get(v.id);
    if (!m) {
        m = L.marker([v.lat, v.lon], { icon: markerIcon(v.pin_color, v.id === selectedId) })
        .addTo(map)
        .on('click', () => selectVenue(v.id, true));
        m.bindPopup(`<div class="popup"><div class="popup-title">${escapeHtml(v.name)}</div>${v.address ? `<a class='popup-link' href='${buildGMapsLink(v)}' target='_blank' rel='noreferrer'>Open in Google Maps</a>` : ''}</div>`);
        markerById.set(v.id, m);
    } else {
        m.setIcon(markerIcon(v.pin_color, v.id === selectedId));
    }
    });
}

function renderList() {
    const list = qs('#list');
    list.innerHTML = '';
    if (filtered.length === 0) {
    list.innerHTML = `<div class="empty">No results. Try a different search.</div>`;
    } else {
    const ul = document.createElement('ul');
    ul.setAttribute('role', 'list');
    filtered.forEach(v => {
        const li = document.createElement('li');
        li.className = 'item' + (v.id === selectedId ? ' selected' : '');
        li.setAttribute('data-id', v.id);
        li.innerHTML = `
        <div class="thumb">${v.image_url ? `<img alt="${escapeHtml(v.name)}" src="${v.image_url}">` : `<div style='display:grid;place-items:center;width:100%;height:100%;font-size:11px;color:var(--muted);'>No image</div>`}<span class="dot" style="background:${v.pin_color}"></span></div>
        <div class="meta">
            <h3 class="title" title="${escapeHtml(v.name)}">${escapeHtml(v.name)}</h3>
            ${v.address ? `<a class="address" target="_blank" rel="noreferrer" href="${buildGMapsLink(v)}">${escapeHtml(v.address)}</a>` : ''}
            <div class="chips">
            ${v.email ? `<a class="chip" href="mailto:${encodeURI(v.email)}">Email</a>` : ''}
            ${v.phone ? `<a class="chip" href="tel:${v.phone.replace(/\s/g,'')}">Call</a>` : ''}
            ${v.facebook ? `<a class="chip" target="_blank" rel="noreferrer" href="${v.facebook}">Facebook</a>` : ''}
            <a class="chip highlight" href="#" data-highlight>Show on map</a>
            </div>
        </div>`;
        ul.appendChild(li);
    });
    list.appendChild(ul);
    }
    qs('#count').textContent = `${filtered.length} location${filtered.length === 1 ? '' : 's'}`;
}

function filterList(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) { filtered = venues.slice(); }
    else {
    filtered = venues.filter(v => v.name.toLowerCase().includes(q) || (v.address || '').toLowerCase().includes(q));
    }
    renderMarkers();
    renderList();
}

function selectVenue(id, fromMap=false) {
    selectedId = id;
    // Update marker icons
    filtered.forEach(v => {
    const m = markerById.get(v.id); if (m) m.setIcon(markerIcon(v.pin_color, v.id === selectedId));
    });
    // Fly to selection
    const v = venues.find(x => x.id === id);
    if (v) {
    map.flyTo([v.lat, v.lon], Math.max(map.getZoom(), 12), { duration: 0.6 });
    const listEl = qs(`.item[data-id="${CSS.escape(id)}"]`);
    if (listEl && listEl.scrollIntoView) listEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Open popup on marker when selection came from list
    if (!fromMap) {
        const m = markerById.get(id); if (m) m.openPopup();
    }
    }
    // Update list selection class
    qsa('.item').forEach(el => el.classList.toggle('selected', el.getAttribute('data-id') === id));
}

function escapeHtml(str) {
    return str;
//   return String(str).replace(/[&<>"]g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
}

// Init UI
filterList('');

qs('#list').addEventListener('click', (e) => {
    const li = e.target.closest('.item');
    if (li && li.hasAttribute('data-id')) {
    // If the click was specifically on the highlight chip, avoid toggling twice
    if (e.target && e.target.matches('[data-highlight]')) e.preventDefault();
    selectVenue(li.getAttribute('data-id'));
    }
});
qs('#list').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-highlight]');
    if (chip) {
    e.preventDefault();
    const li = chip.closest('.item');
    if (li) selectVenue(li.getAttribute('data-id'));
    }
});

