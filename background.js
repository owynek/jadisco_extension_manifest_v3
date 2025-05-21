import { playSound, unlockSound } from './playSound.js';

let websocket = null;
let websocketHeartbeatInterval = null;
let reconnectTimeout = null;
let reconnectAttempts = 0;
let streamStatus = false;
let topic = '';

const WS_URL = 'wss://livegamers.pl/api/pubsub';
const SITE_ID = 16;
const BASE_RECONNECT_INTERVAL = 5000;
const MAX_RECONNECT_INTERVAL = 60000;

function log(level, ...args) {
    const levels = {
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
    };
    const prefix = `[${new Date().toLocaleTimeString()}] ${levels[level] || ''}`;
    console[level](`${prefix}`, ...args);
}

function makeWebsocket() {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        log('info', 'WebSocket already open. 👌');
        return;
    }
    try {
        websocket = new WebSocket(WS_URL);
        makeListeners();
    } catch (err) {
        log('error', 'WebSocket creation failed:', err);
        scheduleReconnect();
    }
}

function cleanupWebsocket() {
    if (websocket) {
        websocket.onopen = null;
        websocket.onmessage = null;
        websocket.onclose = null;
        websocket.onerror = null;
        websocket.close();
        websocket = null;
    }
    stopHeartbeat();
}

function makeListeners() {
    websocket.onopen = () => {
        log('info', 'Connected to server 🌞');
        updateBall(streamStatus);
        websocket.send(JSON.stringify({ type: 'follow', site_id: SITE_ID }));
        startHeartbeat();
        reconnectAttempts = 0;
    };

    websocket.onmessage = (event) => {
        let messageJson;
        try {
            messageJson = JSON.parse(event.data);
        } catch (e) {
            log('warn', '🤖 Invalid JSON received:', event.data);
            return;
        }

        const type = messageJson.type;
        if (type === 'ping') {
            log('info', '🏓 Ping received');
        } else if (type === 'status') {
            chrome.storage.local.set({ lastMsg: messageJson });
            chrome.runtime.sendMessage({ type: 'statusUpdate', payload: messageJson }).catch((error) => {
                log('warn', '🤖 No receiver for statusUpdate message:', error);
            });

            let statusReceived = 0;
            for (const element of messageJson.data.services) {
                if (element.status.status === 1) {
                    statusReceived = 1;
                    break;
                }
            }

            updateBall(statusReceived);

            if (statusReceived === 1 && !streamStatus) {
                streamStatus = true;
                showNotification(topic === '' ? 'Strumień trwa.' : 'Strumień właśnie się zaczął!', true);
                playSound();
            } else if (statusReceived === 0) {
                streamStatus = false;
            }

            try {
                const topicReceived = messageJson.data.topic.text;
                if (topic !== topicReceived) {
                    if (topic !== '') {
                        showNotification('Nowy temat: ' + topicReceived, false);
                    }
                    topic = topicReceived;
                }
            } catch (e) {
                log('warn', '🤖 Topic parse error:', e.message);
            }
        }
    };

    websocket.onclose = () => {
        log('warn', 'Disconnected from server ⛈️');
        cleanupWebsocket();
        updateBall('disconnected');
        scheduleReconnect();
    };

    websocket.onerror = (e) => {
        log('error', 'WebSocket error:', e);
    };
}

function startHeartbeat() {
    stopHeartbeat();
    websocketHeartbeatInterval = setInterval(() => {
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({ type: 'pong' }));
        }
    }, 20000);
}

function stopHeartbeat() {
    clearInterval(websocketHeartbeatInterval);
    websocketHeartbeatInterval = null;
}

function scheduleReconnect() {
    if (reconnectTimeout) return;

    const delay = Math.min(BASE_RECONNECT_INTERVAL * 2 ** reconnectAttempts, MAX_RECONNECT_INTERVAL);
    reconnectAttempts++;
    log('info', `🔌 Reconnecting in ${Math.round(delay / 1000)}s...`);

    reconnectTimeout = setTimeout(() => {
        reconnectTimeout = null;
        makeWebsocket();
    }, delay);
}

function updateBall(status) {
    const iconBase = {
        '1': 'online',
        'disconnected': 'disconnected',
        '0': '',
    };
    const suffix = iconBase[status] || '';
    chrome.action.setIcon({
        path: {
            '16': `/icons/16${suffix ? '-' + suffix : ''}.png`,
            '32': `/icons/32${suffix ? '-' + suffix : ''}.png`,
        },
    });
}

function showNotification(mainMessage, silent) {
    chrome.storage.sync.get({ removeNotification: true }, (options) => {
        if (chrome.notifications && chrome.notifications.create) {
            chrome.notifications.create(
                'status',
                {
                    type: 'basic',
                    iconUrl: '/icons/128.png',
                    title: 'Jadisco.pl',
                    requireInteraction: options.removeNotification,
                    priority: 2,
                    silent: silent,
                    message: mainMessage,
                },
                (callback_id) => {
                    if (options.removeNotification) {
                        setTimeout(() => {
                            chrome.notifications.clear(callback_id);
                        }, 15000);
                    }
                },
            );
        } else {
            log('warn', 'Notifications API not available');
        }
    });
}

chrome.runtime.onMessage.addListener(async (message) => {
    if (message.type === 'closeOffscreen') {
        try {
            const hasDoc = await chrome.offscreen.hasDocument();
            if (hasDoc) {
                await chrome.offscreen.closeDocument();
            }
        } catch (e) {
            console.warn('🔴 Error closing offscreen document:', e);
        } finally {
            unlockSound();
        }
    }
    if (message.type === 'manualRefresh') {
        log('info', '🔄 Manual refresh requested 🫡');
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({ type: 'follow', site_id: SITE_ID }));
        } else {
            makeWebsocket();
        }
    }
});

chrome.notifications.onClicked.addListener(() => {
    chrome.tabs.create({ url: 'https://jadisco.pl' });
});

chrome.alarms.create('keepAlive', { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'keepAlive') {
        log('info', '🔁 Keep-alive ping 🏓');
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({ type: 'pong' }));
        }
        if (!websocket || websocket.readyState !== WebSocket.OPEN) {
            log('info', '🔄 Reconnect after wake 💤');
            makeWebsocket();
        }
    }
});

log('info', '🟢 background.js loaded 🦾');
makeWebsocket();
