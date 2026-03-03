import { NOTIFICATION_CLEAR_DELAY, NOTIFICATION_MODES } from './constants.js';

function createNotification(notificationId, options) {
    return new Promise((resolve) => {
        chrome.notifications.create(notificationId, options, () => {
            resolve(notificationId);
        });
    });
}

export async function showNotification(event, syncSettings, log) {
    if (!chrome.notifications?.create) {
        log('warn', 'Notifications API not available.');
        return null;
    }

    const notificationId = `${event.kind}-${Date.now()}`;

    await createNotification(notificationId, {
        type: 'basic',
        iconUrl: '/icons/128.png',
        title: 'Jadisco.pl',
        requireInteraction: syncSettings.notificationMode === NOTIFICATION_MODES.REQUIRE_INTERACTION,
        priority: 2,
        silent: Boolean(event.silent),
        message: event.message,
    });

    if (syncSettings.notificationMode === NOTIFICATION_MODES.AUTO_DISMISS) {
        setTimeout(() => {
            chrome.notifications.clear(notificationId, () => {
                void chrome.runtime.lastError;
            });
        }, NOTIFICATION_CLEAR_DELAY);
    }

    return notificationId;
}
