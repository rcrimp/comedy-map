const NZ_BOUNDS = L.latLngBounds(L.latLng(-48.0, 165.0), L.latLng(-33.5, 179.9));

const map = L.map('map', {
    zoomControl: true,
    maxBounds: NZ_BOUNDS,
    maxBoundsViscosity: 1.0,
    minZoom: 5,
}).fitBounds(NZ_BOUNDS.pad(0));

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
// 	attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
// }).addTo(map);
// L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
// 	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
// 	subdomains: 'abcd',
// 	// maxZoom: 20
// }).addTo(map);

let openMicList = []
let selectedId = null;

// Marker store
const markerById = new Map();

const markerIcon = (color, selected=false) => L.divIcon({
    className: '',
    html: `<div class="pin ${selected ? 'selected' : ''}" style="--c:${color || '#2563eb'}"></div>`,
    iconSize: [24, 30],
    iconAnchor: [12, 26],
    popupAnchor: [0, -24]
});

const renderMarkers = () => {
    // Remove all existing markers
    for (const m of markerById.values()) {
        map.removeLayer(m);
    }
    markerById.clear();

    // Add new markers
    openMicList.forEach(v => {
        const m = L.marker([v.lat, v.lon])
            .bindPopup(itemCard(v), { minWidth: 240 })
            .addTo(map);
        markerById.set(v.id, m);
    });
};

const itemCard = (item) => {
    let signUp = item.url ? `<a href="${item.url}" target="_blank" rel="noreferrer">${escapeHtml(item.signup)}</a>` : `<span>${escapeHtml(item.signup)}</span>`;
    return `<div class="item-title">${escapeHtml(item.name)}</div>
        <div class="item-booker">${escapeHtml(item.booker)}</div>
        <div class="item-day">📅 ${escapeHtml(item.dayOfWeek)}, ${escapeHtml(item.frequency)}</div>
        <div class="item-location">📍 ${escapeHtml(item.venue)}, ${escapeHtml(item.address)}, ${escapeHtml(item.city)}</div>
        <div class="item-contact">${signUp}</div>`;
}

const renderList = () => {
    const listId = '#list';
    const list = document.querySelector(listId);
    if (!list) return;
    list.innerHTML = '';
    const ul = document.createElement('ul');
    ul.setAttribute('role', 'list'); 
    openMicList.forEach(v => {
        const li = document.createElement('li');
        li.className = 'item' + (v.id === selectedId ? ' selected' : '');
        li.setAttribute('data-id', v.id);
        li.innerHTML = itemCard(v);
        li.setAttribute('data-city', v.city);
        ul.appendChild(li);
    });
    list.appendChild(ul);
    updateResultCount(openMicList.length);
};

const updateResultCount = (n) => {
    document.querySelector('#result-count').textContent = `${n} Show${n === 1 ? '' : 's'}${(n < openMicList.length) ? ` (${(openMicList.length - n)} hidden)` : ''}`;
}

// -- fetch data
const API_URL = 'https://script.google.com/macros/s/AKfycbyCu18pJNvEiVC5HKWxm5wh7So2e1ksSJTH7zaB21Z-7Uw1SJOR9HW1JgEui1HabG0Lcw/exec';

const fetchData = async () => {
    try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status} - ${res.statusText}`);
        const data = await res.json();
        console.log('Fetched data:', data);
        return data;
    } catch (err) {
        console.error('Error fetching data:', err);
        return null;
    }
};

const escapeHtml = (unsafe) => {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

const parseLatLon = (latLonStr) => {
    const parts = latLonStr.split(',').map(s => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return { lat: parts[0], lon: parts[1] };
    }
    return null;
}

const parseItem = (item, idx) => {
    const latLon = parseLatLon(item["Lat Lon"]);
    if (!latLon) {
        console.warn('Invalid latlon format:', item["Lat Lon"]);
        return null;
    }
    return {
        id: idx,
        lat: latLon.lat,
        lon: latLon.lon,
        name: item["Show name"] || 'Unnamed Open Mic',
        address: item["Address"] || '',
        city: item["City"] || '',
        frequency: item["Frequency"] || '',
        venue: item["Venue"] || '',
        dayOfWeek: item["Day of Week"] || '',
        booker: item["Booker"] || '',
        signup: item["Signup"] || 'N/A',
        url: item["URL"] || '',
    }
}

const regionSelect = (city) => {
    const select = document.querySelector('#region');
    if (!select) return;
    if (city && !Array.from(select.options).some(opt => opt.value === city)) {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        select.appendChild(option);
    }
}

const onPageLoad = async () => {
    const data = await fetchData();
    if (data && Array.isArray(data) && data.length > 0) {
        openMicList = [];
        for (const item of data) {
            const itemData = parseItem(item, openMicList.length);
            regionSelect(itemData.city);
            openMicList.push(itemData);
        }
        renderMarkers();
        renderList();
    } else {
        console.error('Invalid data format received:', data);
    }
}

const filterList = (city) => {
    const listItems = document.querySelectorAll('#list .item');
    let visibleCount = 0;
    listItems.forEach(item => {
        const itemCity = item.getAttribute('data-city');
        if (city === 'all' || itemCity === city) {
            item.style.display = 'block';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    // hide markers
    for (const [id, marker] of markerById.entries()) {
        const item = Array.from(listItems).find(li => li.getAttribute('data-id') === id.toString());
        if (item && (city === 'all' || item.getAttribute('data-city') === city)) {
            if (!map.hasLayer(marker)) marker.addTo(map);
        } else {
            if (map.hasLayer(marker)) map.removeLayer(marker);
        }
    }

    updateResultCount(visibleCount);
}

document.querySelector('#region').addEventListener('change', (e) => {
    const city = e.target.value;
    filterList(city);
});

window.addEventListener('load', onPageLoad);

const selectMarker = (id) => {
    // zoom to marker
    const marker = markerById.get(parseInt(id));
    if (marker) {
        marker.openPopup();
        // map.setView(marker.getLatLng(), Math.max(map.getZoom(), 12), { animate: true, duration: 0.6 });
        map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 12), { duration: 0.6 });
    }
}

// select markers

// select list items
document.querySelector('#list').addEventListener('click', (e) => {
    const li = e.target.closest('li.item');
    if (!li) return;
    const id = li.getAttribute('data-id');
    if (!id) return;
    selectedId = id;

    selectMarker(id);

    // renderList();
    // const marker = markerById.get(parseInt(id));
    // if (marker) {
    //     marker.openPopup();
    //     map.setView(marker.getLatLng(), Math.max(map.getZoom(), 12), { animate: true });
    // }
});