import { JADISCO_URL, JADISCO_URL_PATTERNS, NOTIFICATION_MODES } from './constants.js';
import { MESSAGE_TYPES } from './messages.js';
import { parseStatusMessage } from './parsers.js';
import { createSound } from './playSound.js';
import { loadPopupState, loadSyncSettings, saveSyncSettings } from './storage.js';

const mutedEl = document.getElementById('muted');
const volumeEl = document.getElementById('volume');
const notificationModeEl = document.getElementById('notificationMode');
const notifyOnStreamStartEl = document.getElementById('notifyOnStreamStart');
const notifyOnTopicChangeEl = document.getElementById('notifyOnTopicChange');
const reportEl = document.getElementById('report');
const statusEl = document.getElementById('status');
const statusTimeEl = document.getElementById('statusTime');
const topicEl = document.getElementById('topic');
const topicTimeEl = document.getElementById('topicTime');
const logoEl = document.getElementById('logo');
const settingsButtonEl = document.getElementById('settingsButton');
const settingsEl = document.getElementById('settings');
const testSoundEl = document.getElementById('testSound');
const manualRefreshEl = document.getElementById('manualRefresh');
const openSidePanelEl = document.getElementById('openSidePanel');
const openChatOnStreamStartEl = document.getElementById('openChatOnStreamStart');
const openChatOnNotificationClickEl = document.getElementById('openChatOnNotificationClick');
const extensionVersionEl = document.getElementById('extensionVersion');

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

function formatConnectionState(connectionState) {
    if (connectionState === 'connected') {
        return 'Connected';
    }

    if (connectionState === 'connecting') {
        return 'Connecting';
    }

    return 'Disconnected';
}

function assignDateToElement(timestamp, element) {
    if (!element) {
        return;
    }

    if (!timestamp) {
        element.textContent = 'No data';
        return;
    }

    const fullDate = new Date(timestamp);

    if (Number.isNaN(fullDate.getTime())) {
        element.textContent = 'No data';
        return;
    }

    const today = new Date();
    const isToday =
        today.getFullYear() === fullDate.getFullYear() &&
        today.getMonth() === fullDate.getMonth() &&
        today.getDate() === fullDate.getDate();

    element.textContent = isToday
        ? fullDate.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
          })
        : fullDate.toLocaleString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
          });
}

function buildSnapshotFromRuntimeState(runtimeState) {
    if (typeof runtimeState?.streamActive !== 'boolean') {
        return null;
    }

    return {
        streamActive: runtimeState.streamActive,
        onlineAt: runtimeState.streamActive ? runtimeState.lastMessageAt : null,
        offlineAt: runtimeState.streamActive ? null : runtimeState.lastMessageAt,
        topic: runtimeState.topic,
        topicUpdatedAt: runtimeState.topicUpdatedAt,
    };
}

function renderSnapshot(snapshot) {
    if (!snapshot) {
        statusEl.textContent = 'No data yet';
        statusEl.className = 'glow glow-red';
        statusTimeEl.textContent = 'No data';
        topicEl.textContent = 'No data yet';
        topicTimeEl.textContent = 'No data';
        return;
    }

    if (snapshot.streamActive) {
        statusEl.textContent = 'Live';
        statusEl.className = 'glow glow-green';
        assignDateToElement(snapshot.onlineAt, statusTimeEl);
    } else {
        statusEl.textContent = 'Offline';
        statusEl.className = 'glow glow-red';
        assignDateToElement(snapshot.offlineAt, statusTimeEl);
    }

    topicEl.textContent = snapshot.topic ?? 'No data yet';
    assignDateToElement(snapshot.topicUpdatedAt, topicTimeEl);
}


function renderState(lastMsg, runtimeState) {
    const parsedSnapshot = parseStatusMessage(lastMsg) ?? buildSnapshotFromRuntimeState(runtimeState);
    renderSnapshot(parsedSnapshot);
}

async function saveOptions() {
    const volume = Number(volumeEl.value);

    await saveSyncSettings({
        muted: mutedEl.checked,
        volume: Number.isFinite(volume) ? volume : 0.5,
        openChatOnStreamStart: openChatOnStreamStartEl.checked,
        openChatOnNotificationClick: openChatOnNotificationClickEl.checked,
        notifyOnStreamStart: notifyOnStreamStartEl.checked,
        notifyOnTopicChange: notifyOnTopicChangeEl.checked,
        notificationMode: notificationModeEl.checked
            ? NOTIFICATION_MODES.AUTO_DISMISS
            : NOTIFICATION_MODES.REQUIRE_INTERACTION,
    });
}

async function setUp() {
    const [settings, popupState] = await Promise.all([loadSyncSettings(), loadPopupState()]);
    const manifestVersion = chrome.runtime.getManifest().version;

    mutedEl.checked = settings.muted;
    volumeEl.value = String(settings.volume);
    notificationModeEl.checked = settings.notificationMode === NOTIFICATION_MODES.AUTO_DISMISS;
    notifyOnStreamStartEl.checked = settings.notifyOnStreamStart;
    notifyOnTopicChangeEl.checked = settings.notifyOnTopicChange;
    openChatOnStreamStartEl.checked = settings.openChatOnStreamStart;
    openChatOnNotificationClickEl.checked = settings.openChatOnNotificationClick;
    if (extensionVersionEl) {
        extensionVersionEl.textContent = manifestVersion;
    }

    renderState(popupState.lastMsg, popupState.runtimeState);
}

async function openJadisco() {
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
    } catch (_) {
        await createTab({ url: JADISCO_URL });
    }
}

function openGitHub() {
    chrome.tabs.create({ url: 'https://github.com/owynek/jadisco_extension_manifest_v3/issues' });
}

function getCurrentWindow() {
    return new Promise((resolve, reject) => {
        chrome.windows.getCurrent((currentWindow) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            if (!currentWindow || !currentWindow.id) {
                reject(new Error('Current window is unavailable.'));
                return;
            }

            resolve(currentWindow);
        });
    });
}

async function openSidePanel() {
    try {
        const currentWindow = await getCurrentWindow();
        const response = await sendRuntimeMessage({
            type: MESSAGE_TYPES.TOGGLE_SIDE_PANEL,
            windowId: currentWindow.id,
        });

        if (!response?.ok) {
            console.warn('Failed to toggle side panel:', response?.error ?? 'Unknown error');
            return;
        }
    } catch (error) {
        console.warn('Failed to toggle side panel:', error.message);
    }
}

function hideSettings() {
    settingsEl.setAttribute('hidden', '');
    settingsButtonEl.textContent = '⚙️';
    settingsButtonEl.setAttribute('aria-expanded', 'false');
}

function refresh() {
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.MANUAL_REFRESH }, () => {
        void chrome.runtime.lastError;
    });

    manualRefreshEl.textContent = 'Updated';

    setTimeout(() => {
        manualRefreshEl.textContent = 'Refresh status';
        hideSettings();
    }, 600);
}

function toggleOptions() {
    if (settingsEl.hasAttribute('hidden')) {
        settingsEl.removeAttribute('hidden');
        settingsButtonEl.textContent = '❌';
        settingsButtonEl.setAttribute('aria-expanded', 'true');
        return;
    }

    hideSettings();
}

chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === MESSAGE_TYPES.STATUS_UPDATE) {
        renderState(message.payload, message.runtimeState);
    }
});

document.addEventListener('DOMContentLoaded', () => {
    void setUp();
});

logoEl.addEventListener('click', () => {
    void openJadisco();
});
reportEl.addEventListener('click', openGitHub);
openSidePanelEl.addEventListener('click', () => {
    void openSidePanel();
});
settingsButtonEl.addEventListener('click', toggleOptions);
mutedEl.addEventListener('change', () => {
    void saveOptions();
});
volumeEl.addEventListener('change', () => {
    void saveOptions();
});
notificationModeEl.addEventListener('change', () => {
    void saveOptions();
});
notifyOnStreamStartEl.addEventListener('change', () => {
    void saveOptions();
});
notifyOnTopicChangeEl.addEventListener('change', () => {
    void saveOptions();
});
openChatOnStreamStartEl.addEventListener('change', () => {
    void saveOptions();
});
openChatOnNotificationClickEl.addEventListener('change', () => {
    void saveOptions();
});
manualRefreshEl.addEventListener('click', refresh);
testSoundEl.addEventListener('click', () => {
    void createSound(Number(volumeEl.value));
});
