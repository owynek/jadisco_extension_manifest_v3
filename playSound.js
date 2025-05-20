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
    chrome.storage.sync.get(
        { muted: false, volume: 0.5 },
        async (items) => {
            if (!items.muted) {
                await createSound(items.volume);
            }
        },
    );
}
