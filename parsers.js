function isRecord(value) {
    return value !== null && typeof value === 'object';
}

function normalizeTimestamp(value) {
    if (typeof value !== 'string' && typeof value !== 'number') {
        return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toISOString();
}

function normalizeTopic(value) {
    if (typeof value !== 'string') {
        return null;
    }

    const topic = value.trim();
    return topic === '' ? null : topic;
}

export function parseStatusMessage(messageJson) {
    if (!isRecord(messageJson) || messageJson.type !== 'status') {
        return null;
    }

    const data = isRecord(messageJson.data) ? messageJson.data : null;
    if (!data || !Array.isArray(data.services)) {
        return null;
    }

    let streamActive = false;
    let onlineAt = null;
    let offlineAt = null;
    let hasKnownStatus = false;

    for (const service of data.services) {
        const status = isRecord(service) && isRecord(service.status) ? service.status : null;
        if (!status) {
            continue;
        }

        const numericStatus = Number(status.status);

        if (numericStatus === 1) {
            hasKnownStatus = true;
            streamActive = true;
            onlineAt = onlineAt ?? normalizeTimestamp(status.online_at);
        }

        if (numericStatus === 0) {
            hasKnownStatus = true;
            offlineAt = offlineAt ?? normalizeTimestamp(status.offline_at);
        }
    }

    if (!hasKnownStatus) {
        return null;
    }

    const topicRecord = isRecord(data.topic) ? data.topic : null;

    return {
        streamActive,
        onlineAt,
        offlineAt,
        topic: topicRecord ? normalizeTopic(topicRecord.text) : null,
        topicUpdatedAt: topicRecord ? normalizeTimestamp(topicRecord.updated_at) : null,
    };
}
