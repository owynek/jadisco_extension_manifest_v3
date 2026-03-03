import {
    CONNECTION_STATES,
    NOTIFICATION_MODES,
    RUNTIME_STATE_DEFAULTS,
    STORAGE_KEYS,
    SYNC_DEFAULTS,
} from './constants.js';
import { parseStatusMessage } from './parsers.js';

function storageGet(area, defaults) {
    return new Promise((resolve, reject) => {
        chrome.storage[area].get(defaults, (items) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            resolve(items);
        });
    });
}

function storageSet(area, values) {
    return new Promise((resolve, reject) => {
        chrome.storage[area].set(values, () => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            resolve();
        });
    });
}

function storageRemove(area, keys) {
    return new Promise((resolve, reject) => {
        chrome.storage[area].remove(keys, () => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            resolve();
        });
    });
}

function normalizeVolume(value) {
    const volume = Number(value);

    if (!Number.isFinite(volume)) {
        return SYNC_DEFAULTS.volume;
    }

    return Math.min(1, Math.max(0, volume));
}

function normalizeNotificationMode(value, removeNotification) {
    if (value === NOTIFICATION_MODES.REQUIRE_INTERACTION) {
        return NOTIFICATION_MODES.REQUIRE_INTERACTION;
    }

    if (value === NOTIFICATION_MODES.AUTO_DISMISS) {
        return NOTIFICATION_MODES.AUTO_DISMISS;
    }

    if (removeNotification === false) {
        return NOTIFICATION_MODES.REQUIRE_INTERACTION;
    }

    return NOTIFICATION_MODES.AUTO_DISMISS;
}

function normalizeBoolean(value, fallback) {
    if (typeof value === 'boolean') {
        return value;
    }

    return fallback;
}

function normalizeText(value) {
    if (typeof value !== 'string') {
        return null;
    }

    const text = value.trim();
    return text === '' ? null : text;
}

function normalizeTimestamp(value) {
    if (typeof value !== 'string') {
        return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toISOString();
}

function normalizeConnectionState(value) {
    if (value === CONNECTION_STATES.CONNECTED) {
        return CONNECTION_STATES.CONNECTED;
    }

    if (value === CONNECTION_STATES.CONNECTING) {
        return CONNECTION_STATES.CONNECTING;
    }

    return CONNECTION_STATES.DISCONNECTED;
}

export function migrateSyncSettings(items = {}) {
    const hasLegacyAutoOpenChat = typeof items.autoOpenChat === 'boolean';

    return {
        muted: Boolean(items.muted),
        volume: normalizeVolume(items.volume),
        openChatOnNotificationClick: normalizeBoolean(
            items.openChatOnNotificationClick,
            hasLegacyAutoOpenChat ? items.autoOpenChat : SYNC_DEFAULTS.openChatOnNotificationClick,
        ),
        openPageOnNotificationClick: normalizeBoolean(
            items.openPageOnNotificationClick,
            SYNC_DEFAULTS.openPageOnNotificationClick,
        ),
        notifyOnStreamStart: normalizeBoolean(items.notifyOnStreamStart, SYNC_DEFAULTS.notifyOnStreamStart),
        notifyOnTopicChange: normalizeBoolean(items.notifyOnTopicChange, SYNC_DEFAULTS.notifyOnTopicChange),
        notificationMode: normalizeNotificationMode(items.notificationMode, items.removeNotification),
    };
}

export async function loadSyncSettings() {
    const items = (await storageGet('sync', null)) ?? {};
    const settings = migrateSyncSettings(items);

    if (
        Object.prototype.hasOwnProperty.call(items, 'autoOpenChat') ||
        Object.prototype.hasOwnProperty.call(items, 'removeNotification') ||
        Object.prototype.hasOwnProperty.call(items, 'openChatOnStreamStart') ||
        typeof items.openChatOnNotificationClick !== 'boolean' ||
        typeof items.openPageOnNotificationClick !== 'boolean' ||
        typeof items.notifyOnStreamStart !== 'boolean' ||
        typeof items.notifyOnTopicChange !== 'boolean' ||
        items.notificationMode !== settings.notificationMode ||
        Number(items.volume) !== settings.volume
    ) {
        await saveSyncSettings(settings);
    }

    return settings;
}

export async function saveSyncSettings(settings) {
    const normalizedSettings = migrateSyncSettings(settings);
    await storageSet('sync', normalizedSettings);
    await storageRemove('sync', ['removeNotification', 'autoOpenChat', 'openChatOnStreamStart']);
    return normalizedSettings;
}

export function normalizeRuntimeState(runtimeState) {
    return {
        ...RUNTIME_STATE_DEFAULTS,
        connectionState: normalizeConnectionState(runtimeState?.connectionState),
        streamActive:
            typeof runtimeState?.streamActive === 'boolean' ? runtimeState.streamActive : RUNTIME_STATE_DEFAULTS.streamActive,
        topic: normalizeText(runtimeState?.topic),
        topicUpdatedAt: normalizeTimestamp(runtimeState?.topicUpdatedAt),
        lastMessageAt: normalizeTimestamp(runtimeState?.lastMessageAt),
        lastNotificationKey:
            typeof runtimeState?.lastNotificationKey === 'string' && runtimeState.lastNotificationKey.trim() !== ''
                ? runtimeState.lastNotificationKey
                : null,
        lastNotificationAt: normalizeTimestamp(runtimeState?.lastNotificationAt),
    };
}

function rebuildRuntimeStateFromLastMessage(lastMsg) {
    const snapshot = parseStatusMessage(lastMsg);
    if (!snapshot) {
        return { ...RUNTIME_STATE_DEFAULTS };
    }

    return normalizeRuntimeState({
        connectionState: CONNECTION_STATES.DISCONNECTED,
        streamActive: snapshot.streamActive,
        topic: snapshot.topic,
        topicUpdatedAt: snapshot.topicUpdatedAt,
        lastMessageAt: new Date().toISOString(),
        lastNotificationKey: null,
        lastNotificationAt: null,
    });
}

export async function loadRuntimeState() {
    const items = await storageGet('local', {
        [STORAGE_KEYS.LAST_MESSAGE]: null,
        [STORAGE_KEYS.RUNTIME_STATE]: null,
    });

    if (items[STORAGE_KEYS.RUNTIME_STATE]) {
        return normalizeRuntimeState(items[STORAGE_KEYS.RUNTIME_STATE]);
    }

    if (items[STORAGE_KEYS.LAST_MESSAGE]) {
        const rebuiltState = rebuildRuntimeStateFromLastMessage(items[STORAGE_KEYS.LAST_MESSAGE]);
        await saveRuntimeState(rebuiltState);
        return rebuiltState;
    }

    return { ...RUNTIME_STATE_DEFAULTS };
}

export async function saveRuntimeState(runtimeState) {
    await storageSet('local', {
        [STORAGE_KEYS.RUNTIME_STATE]: normalizeRuntimeState(runtimeState),
    });
}

export async function saveLastMessage(lastMsg) {
    await storageSet('local', {
        [STORAGE_KEYS.LAST_MESSAGE]: lastMsg,
    });
}

export async function loadPopupState() {
    const items = await storageGet('local', {
        [STORAGE_KEYS.LAST_MESSAGE]: null,
        [STORAGE_KEYS.RUNTIME_STATE]: null,
    });

    return {
        lastMsg: items[STORAGE_KEYS.LAST_MESSAGE],
        runtimeState: normalizeRuntimeState(items[STORAGE_KEYS.RUNTIME_STATE]),
    };
}
