const mutedEl = document.getElementById('muted');
const volumeEl = document.getElementById('volume');
const removeNotificationEl = document.getElementById('removeNotification');
const saveEl = document.getElementById('save');
const statusEl = document.getElementById('status');
const statusTimeEl = document.getElementById('statusTime');
const topicEl = document.getElementById('topic');
const topicTimeEl = document.getElementById('topicTime');
const logoEl = document.getElementById('logo');
const settingsButtonEl = document.getElementById('settingsButton');
const settingsEl = document.getElementById('settings');
const testSoundEl = document.getElementById('testSound');

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

    chrome.storage.sync.set(
        { muted: MUTED, volume: VOLUME, removeNotification: REMOVE_NOTIFICATION },
        () => {
            saveEl.textContent = '🔥 Options saved 🔥';
            setTimeout(() => {
                saveEl.textContent = '💾 Save';
                hideSettings();
            }, 1000);
        },
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
        { muted: false, volume: 0.5, removeNotification: true},
        (items) => {
            mutedEl.checked = items.muted;
            volumeEl.value = items.volume;
            removeNotificationEl.checked = items.removeNotification;
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
    chrome.tabs.create({ url: 'https://jadisco.pl' });
}

function hideSettings() {
    settingsEl.setAttribute('hidden', null);
    settingsButtonEl.innerText = '⚙️';
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
    saveEl.removeEventListener('click', saveOptions);
    logoEl.removeEventListener('click', openJadisco);
    settingsButtonEl.removeEventListener('click', toggleOptions);
};

document.addEventListener('DOMContentLoaded', setUp);
logoEl.addEventListener('click', openJadisco);
settingsButtonEl.addEventListener('click', toggleOptions);
saveEl.addEventListener('click', saveOptions);
testSoundEl.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'playSound' });
});
