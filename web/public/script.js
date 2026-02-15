const menuToggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');

if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => {
        nav.classList.toggle('active');
    });
}

const nowPlayingElement = document.getElementById('now-playing-title');

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