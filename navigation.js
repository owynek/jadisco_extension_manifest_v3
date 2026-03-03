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

function getLastFocusedWindow() {
    return new Promise((resolve, reject) => {
        chrome.windows.getLastFocused({}, (window) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            resolve(window);
        });
    });
}

function openSidePanel(windowId) {
    return new Promise((resolve, reject) => {
        chrome.sidePanel.open({ windowId }, () => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            resolve();
        });
    });
}

export async function openOrFocusJadiscoTab(log) {
    try {
        const tabs = await queryTabs({ url: JADISCO_URL_PATTERNS });
        const tabToFocus = tabs[0];

        if (!tabToFocus || tabToFocus.id === undefined) {
            await createTab({ url: JADISCO_URL });
            return;
        }

        await updateTab(tabToFocus.id, { active: true });

        if (tabToFocus.windowId !== undefined) {
            await updateWindow(tabToFocus.windowId, { focused: true });
        }
    } catch (error) {
        log('warn', 'Cannot focus Jadisco tab. Opening a new tab instead.', error.message);
        await createTab({ url: JADISCO_URL });
    }
}

export async function openSidePanelInLastFocusedWindow(log) {
    try {
        const currentWindow = await getLastFocusedWindow();

        if (!currentWindow || !currentWindow.id || currentWindow.type !== 'normal') {
            return false;
        }

        await openSidePanel(currentWindow.id);
        return true;
    } catch (error) {
        log('warn', 'Cannot open side panel.', error.message);
        return false;
    }
}

export async function openChatSidePanelIfEnabled(syncSettings, log) {
    if (!syncSettings.openChatOnStreamStart) {
        return false;
    }

    return openSidePanelInLastFocusedWindow(log);
}

export async function handleNotificationClick(syncSettings, log) {
    if (syncSettings.openChatOnNotificationClick) {
        const sidePanelOpened = await openSidePanelInLastFocusedWindow(log);
        if (sidePanelOpened) {
            return;
        }
    }

    await openOrFocusJadiscoTab(log);
}
