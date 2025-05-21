let isPlaying = false;
let fallbackTimeout = null;

export async function createSound(volume) {
    const hasDoc = await chrome.offscreen.hasDocument();
    if (!hasDoc) {
        await chrome.offscreen.createDocument({
            url: chrome.runtime.getURL('audio.html'),
            reasons: ['AUDIO_PLAYBACK'],
            justification: 'Play notification sound when stream starts',
        });
    }
    await chrome.runtime.sendMessage({ volume: volume });
}

export function playSound() {
    if (isPlaying) return;
    isPlaying = true;

    chrome.storage.sync.get(
        { muted: false, volume: 0.5 },
        async (items) => {
            if (!items.muted) {
                try {
                    await createSound(items.volume);

                    fallbackTimeout = setTimeout(() => {
                        unlockSound();
                    }, 3000);
                } catch (e) {
                    console.error('🔴 Error in playSound:', e);
                    unlockSound();
                }
            } else {
                unlockSound();
            }
        },
    );
}

export function unlockSound() {
    if (fallbackTimeout) {
        clearTimeout(fallbackTimeout);
        fallbackTimeout = null;
    }
    isPlaying = false;
}
