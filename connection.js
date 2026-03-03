import {
    BASE_RECONNECT_INTERVAL,
    CONNECTION_STATES,
    HEARTBEAT_INTERVAL,
    KEEP_ALIVE_ALARM_NAME,
    MAX_RECONNECT_INTERVAL,
    RUNTIME_STATE_DEFAULTS,
    SITE_ID,
    WS_URL,
} from './constants.js';
import { MESSAGE_TYPES } from './messages.js';
import { handleNotificationClick } from './navigation.js';
import { showNotification, showTestNotification } from './notifications.js';
import { parseStatusMessage } from './parsers.js';
import { playSound, unlockSound } from './playSound.js';
import {
    deriveNotificationEvents,
    deriveRuntimeState,
    didStreamStart,
    setConnectionState,
    withNotificationMetadata,
} from './state.js';
import { loadRuntimeState, loadSyncSettings, saveLastMessage, saveRuntimeState } from './storage.js';

let websocket = null;
let websocketHeartbeatInterval = null;
let reconnectTimeout = null;
let reconnectAttempts = 0;
let runtimeState = { ...RUNTIME_STATE_DEFAULTS };
let syncSettings = null;
const openedSidePanelWindowIds = new Set();
let lastFocusedNormalWindowId = null;

function log(level, ...args) {
    const prefix = `[${new Date().toLocaleTimeString()}]`;

    if (level === 'warn') {
        console.warn(prefix, ...args);
        return;
    }

    if (level === 'error') {
        console.error(prefix, ...args);
        return;
    }

    console.info(prefix, ...args);
}

async function persistRuntimeState(nextRuntimeState) {
    runtimeState = nextRuntimeState;
    await saveRuntimeState(runtimeState);
    updateActionIcon(runtimeState);
}

function updateActionIcon(state = runtimeState) {
    const iconSuffix = state.streamActive ? '-online' : '-disconnected';

    chrome.action.setIcon({
        path: {
            32: `/icons/32${iconSuffix}.png`,
        },
    });

    if (state.connectionState === CONNECTION_STATES.CONNECTED && state.streamActive) {
        chrome.action.setBadgeText({ text: 'LIVE' });
        chrome.action.setBadgeBackgroundColor({ color: '#c01212' });
        return;
    }

    if (state.connectionState === CONNECTION_STATES.DISCONNECTED) {
        chrome.action.setBadgeText({ text: 'DISC' });
        chrome.action.setBadgeBackgroundColor({ color: '#dcd10d' });
        return;
    }

    if (state.connectionState === CONNECTION_STATES.CONNECTING) {
        chrome.action.setBadgeText({ text: 'SYNC' });
        chrome.action.setBadgeBackgroundColor({ color: '#2563eb' });
        return;
    }

    chrome.action.setBadgeText({ text: 'OFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#4b5563' });
}

function startHeartbeat() {
    stopHeartbeat();

    websocketHeartbeatInterval = setInterval(() => {
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({ type: 'pong' }));
        }
    }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
    clearInterval(websocketHeartbeatInterval);
    websocketHeartbeatInterval = null;
}

function cleanupWebSocket() {
    if (websocket) {
        websocket.onopen = null;
        websocket.onmessage = null;
        websocket.onclose = null;
        websocket.onerror = null;

        try {
            websocket.close();
        } catch (_) {
            // Ignore close errors for stale sockets.
        }

        websocket = null;
    }

    stopHeartbeat();
}

function rememberFocusedNormalWindow(window) {
    if (!window || !window.id || window.type !== 'normal') {
        return;
    }

    lastFocusedNormalWindowId = window.id;
}

function seedLastFocusedNormalWindow() {
    chrome.windows.getLastFocused({}, (window) => {
        if (chrome.runtime.lastError) {
            return;
        }

        rememberFocusedNormalWindow(window);
    });
}

function scheduleReconnect() {
    if (reconnectTimeout) {
        return;
    }

    const delay = Math.min(BASE_RECONNECT_INTERVAL * 2 ** reconnectAttempts, MAX_RECONNECT_INTERVAL);
    reconnectAttempts += 1;

    reconnectTimeout = setTimeout(() => {
        reconnectTimeout = null;
        void connectWebSocket();
    }, delay);
}

function broadcastStatusUpdate(payload) {
    chrome.runtime.sendMessage(
        {
            type: MESSAGE_TYPES.STATUS_UPDATE,
            payload,
            runtimeState,
        },
        () => {
            void chrome.runtime.lastError;
        },
    );
}

async function handleStatusMessage(messageJson) {
    const snapshot = parseStatusMessage(messageJson);
    if (!snapshot) {
        log('warn', 'Invalid status payload received.');
        return;
    }

    const receivedAt = new Date().toISOString();
    const previousState = runtimeState;
    let nextRuntimeState = deriveRuntimeState(previousState, snapshot, receivedAt);
    const streamStarted = didStreamStart(previousState, snapshot);

    await saveLastMessage(messageJson);

    if (streamStarted) {
        void playSound();
    }

    const notificationEvents = deriveNotificationEvents(previousState, snapshot, syncSettings);

    for (const event of notificationEvents) {
        if (nextRuntimeState.lastNotificationKey === event.notificationKey) {
            continue;
        }

        await showNotification(event, syncSettings, log);
        nextRuntimeState = withNotificationMetadata(nextRuntimeState, event.notificationKey, new Date().toISOString());
    }

    await persistRuntimeState(nextRuntimeState);
    broadcastStatusUpdate(messageJson);
}

function bindWebSocketListeners(socket) {
    socket.onopen = async () => {
        if (websocket !== socket) {
            return;
        }

        reconnectAttempts = 0;
        await persistRuntimeState(setConnectionState(runtimeState, CONNECTION_STATES.CONNECTED));
        socket.send(JSON.stringify({ type: 'follow', site_id: SITE_ID }));
        startHeartbeat();
    };

    socket.onmessage = async (event) => {
        if (websocket !== socket) {
            return;
        }

        let messageJson;

        try {
            messageJson = JSON.parse(event.data);
        } catch (_) {
            log('warn', 'Invalid JSON received.');
            return;
        }

        if (messageJson.type === 'status') {
            await handleStatusMessage(messageJson);
        }
    };

    socket.onclose = async () => {
        if (websocket !== socket) {
            return;
        }

        cleanupWebSocket();
        await persistRuntimeState(setConnectionState(runtimeState, CONNECTION_STATES.DISCONNECTED));
        scheduleReconnect();
    };

    socket.onerror = (error) => {
        if (websocket !== socket) {
            return;
        }

        log('error', 'WebSocket error:', error);
    };
}

async function connectWebSocket() {
    if (websocket && (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING)) {
        return;
    }

    await persistRuntimeState(setConnectionState(runtimeState, CONNECTION_STATES.CONNECTING));

    try {
        const socket = new WebSocket(WS_URL);
        websocket = socket;
        bindWebSocketListeners(socket);
    } catch (error) {
        log('error', 'WebSocket creation failed:', error);
        await persistRuntimeState(setConnectionState(runtimeState, CONNECTION_STATES.DISCONNECTED));
        scheduleReconnect();
    }
}

async function closeOffscreenDocument() {
    try {
        const hasDocument = await chrome.offscreen.hasDocument();

        if (hasDocument) {
            await chrome.offscreen.closeDocument();
        }
    } catch (error) {
        log('warn', 'Error closing offscreen document:', error);
    } finally {
        unlockSound();
    }
}

async function toggleSidePanel(windowId) {
    if (!windowId) {
        throw new Error('Missing windowId for side panel toggle.');
    }

    const isPanelOpen = openedSidePanelWindowIds.has(windowId);

    if (isPanelOpen) {
        await chrome.sidePanel.close({ windowId });
        openedSidePanelWindowIds.delete(windowId);
        return { action: 'closed' };
    }

    await chrome.sidePanel.open({ windowId });
    openedSidePanelWindowIds.add(windowId);
    return { action: 'opened' };
}

function registerSidePanelStateListeners() {
    if (chrome.sidePanel?.onOpened?.addListener) {
        chrome.sidePanel.onOpened.addListener((info) => {
            if (info?.windowId) {
                openedSidePanelWindowIds.add(info.windowId);
            }
        });
    }

    if (chrome.sidePanel?.onClosed?.addListener) {
        chrome.sidePanel.onClosed.addListener((info) => {
            if (info?.windowId) {
                openedSidePanelWindowIds.delete(info.windowId);
            }
        });
    }
}

function registerListeners() {
    registerSidePanelStateListeners();
    seedLastFocusedNormalWindow();

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message?.type === MESSAGE_TYPES.CLOSE_OFFSCREEN) {
            void closeOffscreenDocument();
            return;
        }

        if (message?.type === MESSAGE_TYPES.MANUAL_REFRESH) {
            if (websocket && websocket.readyState === WebSocket.OPEN) {
                websocket.send(JSON.stringify({ type: 'follow', site_id: SITE_ID }));
                return;
            }

            void connectWebSocket();
            return;
        }

        if (message?.type === MESSAGE_TYPES.TEST_NOTIFICATION) {
            void showTestNotification(log)
                .then((notificationId) => {
                    sendResponse({ ok: true, notificationId });
                })
                .catch((error) => {
                    log('warn', 'Cannot create test notification.', error.message);
                    sendResponse({ ok: false, error: error.message });
                });

            return true;
        }

        if (message?.type === MESSAGE_TYPES.TOGGLE_SIDE_PANEL) {
            void toggleSidePanel(message.windowId)
                .then((result) => {
                    sendResponse({ ok: true, ...result });
                })
                .catch((error) => {
                    log('warn', 'Cannot toggle side panel.', error.message);
                    sendResponse({ ok: false, error: error.message });
                });

            return true;
        }
    });

    chrome.notifications.onClicked.addListener(() => {
        handleNotificationClick(syncSettings, lastFocusedNormalWindowId, log);
    });

    chrome.alarms.create(KEEP_ALIVE_ALARM_NAME, { periodInMinutes: 1 });

    chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name !== KEEP_ALIVE_ALARM_NAME) {
            return;
        }

        if (websocket && websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({ type: 'pong' }));
            return;
        }

        void connectWebSocket();
    });

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'sync') {
            return;
        }

        if (
            changes.autoOpenChat ||
            changes.openChatOnNotificationClick ||
            changes.openPageOnNotificationClick ||
            changes.muted ||
            changes.volume ||
            changes.notifyOnStreamStart ||
            changes.notifyOnTopicChange ||
            changes.notificationMode ||
            changes.removeNotification
        ) {
            void loadSyncSettings().then((settings) => {
                syncSettings = settings;
            });
        }
    });

    chrome.windows.onFocusChanged.addListener((windowId) => {
        if (windowId === chrome.windows.WINDOW_ID_NONE) {
            return;
        }

        chrome.windows.get(windowId, {}, (window) => {
            if (chrome.runtime.lastError) {
                return;
            }

            rememberFocusedNormalWindow(window);
        });
    });

    chrome.windows.onRemoved.addListener((windowId) => {
        if (lastFocusedNormalWindowId === windowId) {
            lastFocusedNormalWindowId = null;
        }
    });
}

export async function bootstrapBackground() {
    syncSettings = await loadSyncSettings();
    runtimeState = await loadRuntimeState();
    updateActionIcon(runtimeState);
    registerListeners();
    await connectWebSocket();
}
