import { MESSAGE_TYPES } from './messages.js';

const player = document.getElementById('player');

function closeOffscreen() {
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.CLOSE_OFFSCREEN }, () => {
        void chrome.runtime.lastError;
    });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== MESSAGE_TYPES.PLAY_SOUND) {
        return;
    }

    if (!player) {
        sendResponse({ ok: false });
        closeOffscreen();
        return;
    }

    const volume = Number(message.volume);

    player.volume = Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 0.5;
    player.currentTime = 0;
    player.onended = () => {
        closeOffscreen();
    };

    sendResponse({ ok: true });

    player.play().catch(() => {
        closeOffscreen();
    });
});
