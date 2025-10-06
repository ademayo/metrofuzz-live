/* ───────────────────────── NAV TOGGLE ───────────────────────── */
const menuToggle = document.querySelector('.menu-toggle');
const nav  = document.querySelector('.nav');

if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => nav.classList.toggle('active'));
}

/* ───────────────────────── AUTOCOMPLETE ─────────────────────── */
const trackInput = document.getElementById('track-input');
const trackIdInput = document.getElementById('track-id');
const suggestionsBox = document.getElementById('suggestions');
const nowPlayingElement = document.getElementById('now-playing-title');

let debounceTimer  = null;
let activeIndex    = -1;
let currentResults = [];

const hideSuggestions = () => {
    suggestionsBox.style.display = 'none';
    suggestionsBox.innerHTML = '';
    currentResults = [];
    activeIndex = -1;
};

const escapeHtml = str =>
    str.replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[ch]));

const selectSuggestion = item => {
    trackInput.value  = item.title;
    trackIdInput.value = item.id;
    hideSuggestions();
};

const renderSuggestions = list => {
    if (!list.length) return hideSuggestions();

    suggestionsBox.innerHTML = list.map((item, i) => {
        const cls = i === activeIndex ? 'suggestion-item active' : 'suggestion-item';
        return `<div class="${cls}" data-id="${item.id}" data-title="${escapeHtml(item.title)}">
                  ${escapeHtml(item.title)}
                </div>`;
    }).join('');

    suggestionsBox.style.display = 'block';

    Array.from(suggestionsBox.children).forEach(el =>
        el.addEventListener('click', () =>
            selectSuggestion({ id: +el.dataset.id, title: el.dataset.title })
        )
    );
};

const fetchSuggestions = async q => {
    try {
        const r   = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const arr = await r.json();
        currentResults = Array.isArray(arr) ? arr : [];
        activeIndex    = -1;
        renderSuggestions(currentResults);
    } catch { hideSuggestions(); }
};

trackInput.addEventListener('input', () => {
    trackIdInput.value = '';
    const q = trackInput.value.trim();
    if (!q) return hideSuggestions();

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fetchSuggestions(q), 180);
});

trackInput.addEventListener('keydown', e => {
    if (!currentResults.length || suggestionsBox.style.display === 'none') return;

    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            activeIndex = (activeIndex + 1) % currentResults.length;
            renderSuggestions(currentResults);
            break;
        case 'ArrowUp':
            e.preventDefault();
            activeIndex = (activeIndex - 1 + currentResults.length) % currentResults.length;
            renderSuggestions(currentResults);
            break;
        case 'Enter':
            if (activeIndex >= 0) {
                e.preventDefault();
                selectSuggestion(currentResults[activeIndex]);
            }
            break;
        case 'Escape':
            hideSuggestions();
            break;
    }
});

/* ───────────────────────── NOW-PLAYING BANNER ───────────────── */
const fetchNowPlaying = async () => {
    try {
        const r   = await fetch('/api/now-playing');
        const j   = await r.json();
        nowPlayingElement.textContent = j.title || 'No Track Playing';
    } catch {
        nowPlayingElement.textContent = 'Error Fetching Track';
    }
};

fetchNowPlaying().then(response => {});
setInterval(fetchNowPlaying, 10_000);

/* ───────────────────────── FOOTER YEAR ──────────────────────── */
const updateFooterYear = () => {
    const span = document.getElementById('current-year');
    if (span) span.textContent = new Date().getFullYear();
};

document.addEventListener('DOMContentLoaded', updateFooterYear);

/* ───────────────────────── REQUEST FORM ─────────────────────── */
const requestForm     = document.getElementById('request-form');
const requestResponse = document.getElementById('request-response');

if (requestForm) {
    requestForm.addEventListener('submit', async ev => {
        ev.preventDefault();

        const name    = requestForm.elements.name.value.trim();
        const trackId = parseInt(trackIdInput.value, 10);

        if (!name || isNaN(trackId)) {
            requestResponse.textContent = '⚠️ Please pick a song from the suggestions.';
            return;
        }

        requestResponse.textContent = 'Submitting…';

        try {
            const res  = await fetch('/api/request', {
                method : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body   : JSON.stringify({ name, trackId })
            });
            const data = await res.json();
            requestResponse.textContent = data.message || 'Unknown response';

            if (res.ok) {
                requestForm.reset();
                hideSuggestions();
            }
        } catch {
            requestResponse.textContent = 'Server error, please try later.';
        }
    });
}