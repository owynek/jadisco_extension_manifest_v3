import { MESSAGE_TYPES } from './messages.js';
import { loadSyncSettings } from './storage.js';

let isPlaying = false;
let fallbackTimeout = null;

function hasOffscreenDocument() {
    return chrome.offscreen.hasDocument();
}

async function ensureOffscreenDocument() {
    const hasDocument = await hasOffscreenDocument();

    if (!hasDocument) {
        await chrome.offscreen.createDocument({
            url: chrome.runtime.getURL('audio.html'),
            reasons: ['AUDIO_PLAYBACK'],
            justification: 'Play notification sound when stream starts',
        });
    }
}

function sendRuntimeMessage(message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            resolve(response);
        });
    });
}

export async function createSound(volume) {
    await ensureOffscreenDocument();
    await sendRuntimeMessage({
        type: MESSAGE_TYPES.PLAY_SOUND,
        volume: Number(volume),
    });
}

export async function playSound() {
    if (isPlaying) {
        return;
    }

    isPlaying = true;

    try {
        const settings = await loadSyncSettings();

        if (settings.muted) {
            unlockSound();
            return;
        }

        await createSound(settings.volume);

        fallbackTimeout = setTimeout(() => {
            unlockSound();
        }, 3000);
    } catch (error) {
        console.error('Error in playSound:', error);
        unlockSound();
    }
}

export function unlockSound() {
    if (fallbackTimeout) {
        clearTimeout(fallbackTimeout);
        fallbackTimeout = null;
    }

    isPlaying = false;
}
