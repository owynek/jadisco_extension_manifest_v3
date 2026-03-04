export const WS_URL = 'wss://livegamers.pl/api/pubsub';
export const SITE_ID = 16;
export const BASE_RECONNECT_INTERVAL = 5000;
export const MAX_RECONNECT_INTERVAL = 60000;
export const HEARTBEAT_INTERVAL = 20000;
export const KEEP_ALIVE_ALARM_NAME = 'keepAlive';
export const NOTIFICATION_CLEAR_DELAY = 15000;

export const JADISCO_URL = 'https://jadisco.pl/';
export const SIDEPANEL_CHAT_URL = 'https://poorchat.net/channels/jadisco';

export const CONNECTION_STATES = Object.freeze({
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
});

export const NOTIFICATION_MODES = Object.freeze({
    AUTO_DISMISS: 'autoDismiss',
    REQUIRE_INTERACTION: 'requireInteraction',
});

export const STORAGE_KEYS = Object.freeze({
    LAST_MESSAGE: 'lastMsg',
    RUNTIME_STATE: 'runtimeState',
});

export const SYNC_DEFAULTS = Object.freeze({
    muted: false,
    volume: 0.5,
    openChatOnNotificationClick: true,
    openPageOnNotificationClick: true,
    notifyOnStreamStart: true,
    notifyOnTopicChange: true,
    notificationMode: NOTIFICATION_MODES.AUTO_DISMISS,
});

export const RUNTIME_STATE_DEFAULTS = Object.freeze({
    connectionState: CONNECTION_STATES.DISCONNECTED,
    streamActive: null,
    topic: null,
    topicUpdatedAt: null,
    lastMessageAt: null,
    lastNotificationKey: null,
    lastNotificationAt: null,
});
