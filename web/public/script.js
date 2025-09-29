const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');

if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => {
        nav.classList.toggle('active');
    });
}

const trackInput = document.getElementById('track-input');
const trackIdInput = document.getElementById('track-id');
const suggestionsBox = document.getElementById('suggestions');
const nowPlayingElement = document.getElementById('now-playing-title');

let debounceTimer = null;
let activeIndex = -1;
let currentSuggestions = [];

const hideSuggestions = () => {
    suggestionsBox.style.display = 'none';
    suggestionsBox.innerHTML = '';
    currentSuggestions = [];
    activeIndex = -1;
};

const escapeHtml = unsafe =>
    unsafe.replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[char]));

const selectSuggestion = item => {
    trackInput.value = item.title;
    trackIdInput.value = item.id;
    hideSuggestions();
};

const renderSuggestions = items => {
    if (!items.length) return hideSuggestions();

    suggestionsBox.innerHTML = items
        .map((item, index) => {
            const activeClass = index === activeIndex ? 'suggestion-item active' : 'suggestion-item';
            return `<div class="${activeClass}" data-id="${item.id}" data-title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>`;
        })
        .join('');

    suggestionsBox.style.display = 'block';

    Array.from(suggestionsBox.children).forEach(el =>
        el.addEventListener('click', () => selectSuggestion({
            id: parseInt(el.getAttribute('data-id'), 10),
            title: el.getAttribute('data-title')
        }))
    );
};

const fetchSuggestions = async query => {
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const list = await response.json();
        currentSuggestions = Array.isArray(list) ? list : [];
        activeIndex = -1;
        renderSuggestions(currentSuggestions);
    } catch {
        hideSuggestions();
    }
};

trackInput.addEventListener('input', () => {
    trackIdInput.value = '';
    const query = trackInput.value.trim();
    if (!query) return hideSuggestions();

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fetchSuggestions(query), 180);
});

trackInput.addEventListener('keydown', event => {
    if (!currentSuggestions.length || suggestionsBox.style.display === 'none') return;

    switch (event.key) {
        case 'ArrowDown':
            event.preventDefault();
            activeIndex = (activeIndex + 1) % currentSuggestions.length;
            renderSuggestions(currentSuggestions);
            break;
        case 'ArrowUp':
            event.preventDefault();
            activeIndex = (activeIndex - 1 + currentSuggestions.length) % currentSuggestions.length;
            renderSuggestions(currentSuggestions);
            break;
        case 'Enter':
            if (activeIndex >= 0) {
                event.preventDefault();
                selectSuggestion(currentSuggestions[activeIndex]);
            }
            break;
        case 'Escape':
            hideSuggestions();
            break;
    }
});

const fetchNowPlaying = async () => {
    try {
        const response = await fetch('/api/now-playing');
        const data = await response.json();
        nowPlayingElement.textContent = data.title || 'No Track Playing';
    } catch {
        nowPlayingElement.textContent = 'Error Fetching Track';
    }
};

fetchNowPlaying().then(r => {});
setInterval(fetchNowPlaying, 10000);

const updateFooterYear = () => {
    const yearSpan = document.getElementById('current-year');

    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    updateFooterYear();
});