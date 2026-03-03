import { JADISCO_URL, SIDEPANEL_CHAT_URL } from './constants.js';

const chatFrameEl = document.getElementById('chatFrame');
const fallbackEl = document.getElementById('chatFallback');
const openJaDiscoButton = document.getElementById('openJaDiscoButton');
const fallbackLinkEl = document.getElementById('chatFallbackLink');

let frameLoaded = false;

function showFallback() {
    // if (frameLoaded || !fallbackEl) {
    //     return;
    // }

    fallbackEl.hidden = false;
    document.body.classList.add('show-fallback');
}

if (fallbackLinkEl) {
    fallbackLinkEl.href = SIDEPANEL_CHAT_URL;
}

if (openJaDiscoButton) {
    openJaDiscoButton.addEventListener('click', () => {
        chrome.tabs.create({ url: JADISCO_URL });
    });
}

if (chatFrameEl) {
    chatFrameEl.addEventListener('load', () => {
        frameLoaded = true;
        if (fallbackEl) {
            fallbackEl.hidden = true;
        }
        document.body.classList.remove('show-fallback');
    });

    chatFrameEl.addEventListener('error', showFallback);
}

setTimeout(showFallback, 5000);
