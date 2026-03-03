import { JADISCO_URL, SIDEPANEL_CHAT_URL } from './constants.js';

const chatFrameEl = document.getElementById('chatFrame');
const fallbackEl = document.getElementById('chatFallback');
const openJaDiscoButton = document.getElementById('openJaDiscoButton');
const fallbackLinkEl = document.getElementById('chatFallbackLink');
const retryChatButtonEl = document.getElementById('retryChatButton');
const fallbackStatusEl = document.getElementById('chatFallbackStatus');

const FRAME_LOAD_TIMEOUT_MS = 5000;
const RETRY_DELAY_MS = 1500;
const MAX_RETRY_ATTEMPTS = 3;

let frameLoaded = false;
let retryAttempts = 0;
let loadTimeoutId = null;
let retryTimeoutId = null;

function clearTimers() {
    if (loadTimeoutId) {
        clearTimeout(loadTimeoutId);
        loadTimeoutId = null;
    }

    if (retryTimeoutId) {
        clearTimeout(retryTimeoutId);
        retryTimeoutId = null;
    }
}

function updateFallbackStatus(message) {
    if (fallbackStatusEl) {
        fallbackStatusEl.textContent = message;
    }
}

function showFallback(message) {
    if (frameLoaded || !fallbackEl) {
        return;
    }

    updateFallbackStatus(message ?? 'Unable to load chat in the side panel.');
    fallbackEl.hidden = false;
    document.body.classList.add('show-fallback');
}

function hideFallback() {
    if (fallbackEl) {
        fallbackEl.hidden = true;
    }

    document.body.classList.remove('show-fallback');
}

function scheduleLoadTimeout() {
    clearTimeout(loadTimeoutId);

    loadTimeoutId = setTimeout(() => {
        handleFrameFailure('Loading chat timed out.');
    }, FRAME_LOAD_TIMEOUT_MS);
}

function reloadChatFrame(resetAttempts = false) {
    if (!chatFrameEl) {
        return;
    }

    if (resetAttempts) {
        retryAttempts = 0;
    }

    clearTimers();
    frameLoaded = false;
    hideFallback();
    updateFallbackStatus('');

    const retryUrl = new URL(SIDEPANEL_CHAT_URL);
    retryUrl.searchParams.set('retry', String(Date.now()));
    chatFrameEl.src = retryUrl.toString();
    scheduleLoadTimeout();
}

function scheduleRetry(reason) {
    if (retryAttempts >= MAX_RETRY_ATTEMPTS) {
        showFallback(`${reason} Retry limit reached.`);
        return;
    }

    retryAttempts += 1;
    showFallback(`Retrying chat load (${retryAttempts}/${MAX_RETRY_ATTEMPTS})...`);

    retryTimeoutId = setTimeout(() => {
        reloadChatFrame();
    }, RETRY_DELAY_MS);
}

function handleFrameFailure(reason = 'Unable to load chat in the side panel.') {
    if (frameLoaded) {
        return;
    }

    clearTimers();
    scheduleRetry(reason);
}

if (fallbackLinkEl) {
    fallbackLinkEl.href = SIDEPANEL_CHAT_URL;
}

if (openJaDiscoButton) {
    openJaDiscoButton.addEventListener('click', () => {
        chrome.tabs.create({ url: JADISCO_URL });
    });
}

if (retryChatButtonEl) {
    retryChatButtonEl.addEventListener('click', () => {
        reloadChatFrame(true);
    });
}

if (chatFrameEl) {
    chatFrameEl.addEventListener('load', () => {
        clearTimers();
        frameLoaded = true;
        retryAttempts = 0;
        hideFallback();
    });

    chatFrameEl.addEventListener('error', () => {
        handleFrameFailure('Chat frame failed to load.');
    });

    scheduleLoadTimeout();
}

window.addEventListener('beforeunload', clearTimers);
