document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('browser-stream');
    const mediaSource = new MediaSource();
    video.src = URL.createObjectURL(mediaSource);

    mediaSource.addEventListener('sourceopen', () => {
        const sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vp8"');

        const ws = new WebSocket(`ws://${window.location.host}`);
        ws.binaryType = 'arraybuffer';

        ws.onmessage = (event) => {
            if (sourceBuffer.updating || mediaSource.readyState !== 'open') {
                return;
            }
            sourceBuffer.appendBuffer(event.data);
        };
    });

    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');

    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    function sendMessage() {
        const messageText = userInput.value.trim();
        if (messageText === '') return;

        addMessage(messageText, 'user');
        userInput.value = '';

        // لاحقاً: سنقوم بإرسال الرسالة إلى الخادم هنا
        // ونستقبل الرد
        fetch('/api/execute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ command: messageText }),
        })
        .then(response => response.json())
        .then(data => {
            addMessage(data.code || data.error, 'bot');
        })
        .catch(error => {
            console.error('Error:', error);
            addMessage('حدث خطأ أثناء الاتصال بالخادم', 'bot');
        });
    }

    function addMessage(text, sender) {
        const message = document.createElement('div');
        message.classList.add('message', sender === 'user' ? 'user-message' : 'bot-message');
        message.textContent = text;
        chatBox.appendChild(message);
        chatBox.scrollTop = chatBox.scrollHeight;
    }
});
