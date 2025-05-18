import { playSound } from './playSound.js';

let websocket;
let websocketHeartbeatInterval;
let connectInterval;
let streamStatus = false;
let topic = '';

function makeWebsocket() {
    if (websocket) {
        console.log('Websocket ready existing');
        return;
    }
    try {
        websocket = new WebSocket('wss://livegamers.pl/api/pubsub');
        makeListeners();
    } catch (err) {
        console.log('Error when creating websocket ' + err);
    }
}

function closeWebsocket() {
    websocket.close();
}

function makeListeners() {
    websocket.onopen = function() {
        console.log('Connected!');
        updateBall(streamStatus);

        websocket.send('{"type":"follow","site_id":16}');

        startHeartbeat();

        clearInterval(connectInterval);
    };

    websocket.onmessage = function(event) {
        let messageJson = JSON.parse(event.data);
        let type = messageJson.type;
        if (type === 'ping') {
            console.log('🏓');
        } else if (type === 'status') {
            chrome.storage.session.set({ lastMsg: messageJson });
            chrome.runtime.sendMessage({ type: 'statusUpdate', payload: messageJson }).catch((error) => {
                console.warn('No receiver for statusUpdate message', error);
            });
            let statusReceived = 0;
            for (const element of messageJson.data.services) {
                if (element.status.status === 1)
                    statusReceived = 1;
            }

            updateBall(statusReceived);

            if (statusReceived === 1) {
                if (!streamStatus) {
                    streamStatus = true;
                    showNotification(topic === '' ? 'Strumień trwa.' : 'Strumień właśnie się zaczął!', true);
                    playSound();
                }
            } else {
                streamStatus = false;
            }

            try {
                let topicReceived = messageJson.data.topic.text;
                if (topic === '') {
                    topic = topicReceived;
                } else {
                    if (topic !== topicReceived) {
                        showNotification('Nowy temat: ' + topicReceived, false);
                        topic = topicReceived;
                    }
                }
            } catch (e) {
                console.log(e.message);
                console.log(messageJson);
            }
        }
    };

    websocket.onclose = function() {
        console.log('Disconnected!');
        chrome.action.setIcon({ path: { '16': '/icons/16-disconnected.png', '32': '/icons/32-disconnected.png' } });

        stopHeartbeat();

        startConnect();
    };
}

function startHeartbeat() {
    stopHeartbeat();
    websocketHeartbeatInterval = setInterval(function() {
        if (websocket.readyState === websocket.OPEN) {
            websocket.send('{"type": "pong"}');
        }
    }, 20000);
}

function stopHeartbeat() {
    clearInterval(websocketHeartbeatInterval);
}

function startConnect() {
    makeWebsocket();
    clearInterval(connectInterval);
    connectInterval = setInterval(function() {
        console.log('Attempt to connect');
        makeWebsocket();
    }, 20000);
}

function showNotification(mainMessage, silent) {
    chrome.storage.sync.get({removeNotification: true }, (options) => {
        chrome.notifications.create('status',
        {
            type: 'basic',
            iconUrl: '/icons/128.png',
            title: 'Jadisco.pl',
            requireInteraction: options.removeNotification,
            priority: 2,
            silent: silent,
            message: mainMessage,
        },
        function(callback_id) {
            if (options.removeNotification)
			{
                setTimeout(function() {
                    chrome.notifications.clear(callback_id);
                }, 15000);
            }
        });
    })
}

function updateBall(statusReceived) {
    if (statusReceived === 1) {
        chrome.action.setIcon({ path: { '16': '/icons/16-online.png', '32': '/icons/32-online.png' } });
    } else {
        chrome.action.setIcon({ path: { '16': '/icons/16.png', '32': '/icons/32.png' } });
    }
}

chrome.notifications.onClicked.addListener(function() {
    chrome.tabs.create({ url: 'https://jadisco.pl' });
});

startConnect();
