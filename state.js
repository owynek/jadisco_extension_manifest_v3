import { CONNECTION_STATES, RUNTIME_STATE_DEFAULTS } from './constants.js';

function normalizeTopic(value) {
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

export function didStreamStart(previousState, snapshot) {
    return previousState.streamActive === false && snapshot.streamActive === true;
}

export function didTopicChange(previousState, snapshot) {
    const previousTopic = normalizeTopic(previousState.topic);
    const nextTopic = normalizeTopic(snapshot.topic);

    return Boolean(previousTopic && nextTopic && previousTopic !== nextTopic);
}

export function setConnectionState(runtimeState, connectionState) {
    return {
        ...RUNTIME_STATE_DEFAULTS,
        ...runtimeState,
        connectionState,
    };
}

export function deriveRuntimeState(previousState, snapshot, receivedAt) {
    return {
        ...RUNTIME_STATE_DEFAULTS,
        ...previousState,
        connectionState: CONNECTION_STATES.CONNECTED,
        streamActive: snapshot.streamActive,
        topic: snapshot.topic ?? previousState.topic ?? null,
        topicUpdatedAt: snapshot.topicUpdatedAt ?? previousState.topicUpdatedAt ?? null,
        lastMessageAt: receivedAt,
    };
}

export function deriveNotificationEvents(previousState, snapshot, syncSettings) {
    const events = [];
    const previousTopic = normalizeTopic(previousState.topic);
    const nextTopic = normalizeTopic(snapshot.topic);

    if (syncSettings.notifyOnStreamStart && didStreamStart(previousState, snapshot)) {
        events.push({
            kind: 'stream',
            notificationKey: `stream:${snapshot.onlineAt ?? 'unknown'}`,
            message: snapshot.topic ? `Stream started: ${snapshot.topic}` : 'Stream just started.',
            silent: true,
        });
    }

    if (syncSettings.notifyOnTopicChange && previousTopic && nextTopic && previousTopic !== nextTopic) {
        events.push({
            kind: 'topic',
            notificationKey: `topic:${snapshot.topicUpdatedAt ?? nextTopic}`,
            message: `New topic: ${nextTopic}`,
            silent: false,
        });
    }

    return events;
}

export function withNotificationMetadata(runtimeState, notificationKey, notificationAt) {
    return {
        ...runtimeState,
        lastNotificationKey: notificationKey,
        lastNotificationAt: notificationAt,
    };
}
