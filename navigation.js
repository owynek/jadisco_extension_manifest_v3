import { JADISCO_URL } from './constants.js';

function createTab(createProperties) {
    return new Promise((resolve, reject) => {
        chrome.tabs.create(createProperties, (tab) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            resolve(tab);
        });
    });
}

export async function openJadiscoTab(log, preferredWindowId = null) {
    const createProperties = preferredWindowId ? { url: JADISCO_URL, windowId: preferredWindowId } : { url: JADISCO_URL };

    try {
        await createTab(createProperties);
    } catch (error) {
        log('warn', 'Cannot open Jadisco tab in preferred window, opening a new one instead.', error.message);
        await createTab({ url: JADISCO_URL });
    }
}

function openSidePanelForNotification(windowId, log, onSuccess, onError) {
    chrome.sidePanel.open({ windowId }, () => {
        if (chrome.runtime.lastError) {
            log('warn', 'Cannot open side panel after notification click:', chrome.runtime.lastError.message);
            onError();
            return;
        }

        onSuccess();
    });
}

export function handleNotificationClick(syncSettings, preferredWindowId, log) {
    const openChatOnNotificationClick = Boolean(syncSettings?.openChatOnNotificationClick);
    const openPageOnNotificationClick = Boolean(syncSettings?.openPageOnNotificationClick);

    const openPage = () => {
        void openJadiscoTab(log, preferredWindowId);
    };

    if (openChatOnNotificationClick && preferredWindowId) {
        openSidePanelForNotification(
            preferredWindowId,
            log,
            () => {
                if (openPageOnNotificationClick) {
                    openPage();
                }
            },
            () => {
                if (openPageOnNotificationClick) {
                    openPage();
                }
            },
        );
        return;
    }

    if (openPageOnNotificationClick) {
        openPage();
    }
}
