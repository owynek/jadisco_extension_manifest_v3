import { createSound } from './playSound.js';

const mutedEl = document.getElementById('muted');
const volumeEl = document.getElementById('volume');
const removeNotificationEl = document.getElementById('removeNotification');
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
const autoOpenChatEl = document.getElementById('autoOpenChat');
const JADISCO_URL = 'https://jadisco.pl/';

function isJadiscoUrl(url) {
    if (!url) {
        return false;
    }

    try {
        const parsedUrl = new URL(url);
        return parsedUrl.hostname === 'jadisco.pl' || parsedUrl.hostname === 'www.jadisco.pl';
    } catch (_) {
        return false;
    }
}

const TODAY = new Date();
const TODAY_ONLY = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());

chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'statusUpdate') {
        assignDataFromMsg(message.payload);
    }
});

const saveOptions = () => {
    const MUTED = mutedEl.checked;
    const VOLUME = volumeEl.value;
    const REMOVE_NOTIFICATION = removeNotificationEl.checked;
    const AUTO_OPEN_CHAT = autoOpenChatEl.checked;

    chrome.storage.sync.set(
        { muted: MUTED, volume: VOLUME, removeNotification: REMOVE_NOTIFICATION, autoOpenChat: AUTO_OPEN_CHAT }
    );
};

function assingDateToElement(dateOnly, element, fullDate) {
    if (dateOnly.getTime() === TODAY_ONLY.getTime()) {
        element.innerText = fullDate.toLocaleTimeString(['pl-PL'], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
    } else {
        element.innerText = fullDate.toLocaleDateString(['pl-PL'], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
    }
}

function assignDataFromMsg(lastMsg) {
    if (!lastMsg.data) {
        statusEl.innerHTML = 'Error';
        statusEl.className = 'glow glow-red';
        return;
    }
    const strimActive = lastMsg.data.services.find(service => service.status.status === 1);
    if (strimActive) {
        statusEl.innerHTML = 'On air';
        statusEl.className = 'glow glow-green';
        const statusDate = new Date(strimActive.status.online_at);
        const statusDateOnly = new Date(statusDate.getFullYear(), statusDate.getMonth(), statusDate.getDate());
        assingDateToElement(statusDateOnly, statusTimeEl, statusDate);
    } else {
        const stream = lastMsg.data.services.find(service => service.status.status === 0);
        statusEl.innerHTML = 'Offline';
        statusEl.className = 'glow glow-red';
        const statusDate = new Date(stream.status.offline_at);
        const statusDateOnly = new Date(statusDate.getFullYear(), statusDate.getMonth(), statusDate.getDate());
        assingDateToElement(statusDateOnly, statusTimeEl, statusDate);
    }
    try {
        topicTimeEl.innerText = '';

        const inputDate = new Date(lastMsg.data.topic.updated_at);
        const inputDateOnly = new Date(inputDate.getFullYear(), inputDate.getMonth(), inputDate.getDate());
        assingDateToElement(inputDateOnly, topicTimeEl, inputDate);

        topicEl.innerText = '';
        topicEl.innerText = lastMsg.data.topic.text;
    } catch (e) {
        console.log(e.message);
        console.log(lastMsg);
    }
}

const setUp = () => {
    chrome.storage.sync.get(
        { muted: false, volume: 0.5, removeNotification: true, autoOpenChat: false },
        (items) => {
            mutedEl.checked = items.muted;
            volumeEl.value = items.volume;
            removeNotificationEl.checked = items.removeNotification;
            autoOpenChatEl.checked = items.autoOpenChat;
        },
    );
    chrome.storage.local.get(
        { lastMsg: {} },
        ({ lastMsg }) => {
            assignDataFromMsg(lastMsg);
        },
    );
};

function openJadisco() {
    chrome.tabs.query({}, (tabs) => {
        if (chrome.runtime.lastError) {
            chrome.tabs.create({ url: JADISCO_URL });
            return;
        }

        const tabToFocus = (tabs || []).find((tab) => isJadiscoUrl(tab.url));

        if (!tabToFocus) {
            chrome.tabs.create({ url: JADISCO_URL });
            return;
        }

        chrome.tabs.update(tabToFocus.id, { active: true }, () => {
            if (chrome.runtime.lastError) {
                chrome.tabs.create({ url: JADISCO_URL });
                return;
            }
            chrome.windows.update(tabToFocus.windowId, { focused: true });
        });
    });
}

function openGitHub() {
    chrome.tabs.create({ url: 'https://github.com/owynek/jadisco_extension_manifest_v3/issues' });
}

function openSidePanel() {
    chrome.windows.getCurrent((currentWindow) => {
        if (!currentWindow || !currentWindow.id) {
            return;
        }

        chrome.sidePanel.open({ windowId: currentWindow.id }, () => {
            if (chrome.runtime.lastError) {
                console.warn('Failed to open side panel:', chrome.runtime.lastError.message);
                return;
            }
            window.close();
        });
    });
}

function hideSettings() {
    settingsEl.setAttribute('hidden', null);
    settingsButtonEl.innerText = '⚙️';
}

const refresh = () => {
    chrome.runtime.sendMessage({ type: 'manualRefresh' });
    manualRefreshEl.innerText = '✔️ Done';
    setTimeout(() => {
        manualRefreshEl.innerText = '🔄 Manual refresh';
        hideSettings();
    }, 600);
}

const toggleOptions = () => {
    if (settingsEl.hasAttribute('hidden')) {
        settingsEl.removeAttribute('hidden');
        settingsButtonEl.innerText = '❌';
    } else {
        hideSettings();
    }
};

window.onblur = function() {
    logoEl.removeEventListener('click', openJadisco);
    settingsButtonEl.removeEventListener('click', toggleOptions);
    reportEl.removeEventListener('click', openGitHub);
    openSidePanelEl.removeEventListener('click', openSidePanel);
    mutedEl.removeEventListener('change', saveOptions);
    volumeEl.removeEventListener('change', saveOptions);
    removeNotificationEl.removeEventListener('change', saveOptions);
    autoOpenChatEl.removeEventListener('change', saveOptions);
    manualRefreshEl.removeEventListener('click', refresh);
    testSoundEl.removeEventListener('click', () => {
        createSound(volumeEl.value);
    });
};

document.addEventListener('DOMContentLoaded', setUp);
logoEl.addEventListener('click', openJadisco);
reportEl.addEventListener('click', openGitHub);
openSidePanelEl.addEventListener('click', openSidePanel);
settingsButtonEl.addEventListener('click', toggleOptions);
mutedEl.addEventListener('change', saveOptions);
volumeEl.addEventListener('change', saveOptions);
removeNotificationEl.addEventListener('change', saveOptions);
autoOpenChatEl.addEventListener('change', saveOptions);
manualRefreshEl.addEventListener('click', refresh);
testSoundEl.addEventListener('click', () => {
    createSound(volumeEl.value);
});
