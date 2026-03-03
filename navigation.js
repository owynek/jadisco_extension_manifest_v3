import { JADISCO_URL, JADISCO_URL_PATTERNS } from './constants.js';

function queryTabs(queryInfo) {
    return new Promise((resolve, reject) => {
        chrome.tabs.query(queryInfo, (tabs) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            resolve(tabs || []);
        });
    });
}

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

function updateTab(tabId, updateProperties) {
    return new Promise((resolve, reject) => {
        chrome.tabs.update(tabId, updateProperties, (tab) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            resolve(tab);
        });
    });
}

function updateWindow(windowId, updateInfo) {
    return new Promise((resolve, reject) => {
        chrome.windows.update(windowId, updateInfo, (window) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            resolve(window);
        });
    });
}

export async function openOrFocusJadiscoTab(log, preferredWindowId = null) {
    try {
        const tabs = await queryTabs({ url: JADISCO_URL_PATTERNS });
        const tabToFocus =
            tabs.find((tab) => preferredWindowId && tab.windowId === preferredWindowId) ??
            tabs[0];

        if (!tabToFocus || tabToFocus.id === undefined) {
            const createProperties = preferredWindowId ? { url: JADISCO_URL, windowId: preferredWindowId } : { url: JADISCO_URL };
            await createTab(createProperties);
            return;
        }

        await updateTab(tabToFocus.id, { active: true });

        if (tabToFocus.windowId !== undefined) {
            await updateWindow(tabToFocus.windowId, { focused: true });
        }
    } catch (error) {
        log('warn', 'Cannot focus Jadisco tab, opening a new one instead.', error.message);
        const createProperties = preferredWindowId ? { url: JADISCO_URL, windowId: preferredWindowId } : { url: JADISCO_URL };
        await createTab(createProperties);
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
        void openOrFocusJadiscoTab(log, preferredWindowId);
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
