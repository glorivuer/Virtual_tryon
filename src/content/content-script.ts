// src/content/content-script.ts

console.log(
    '%c AI Virtual Try-On: Content Script Loaded Successfully! %c',
    'background: #28a745; color: #ffffff; font-weight: bold; border-radius: 4px; padding: 4px;',
    ''
);

const MODAL_ID = 'ai-try-on-ext-fullscreen-modal';

function createFullScreenModal(imageSrc: string) {
    document.getElementById(MODAL_ID)?.remove();

    const modal = document.createElement('div');
    modal.id = MODAL_ID;
    Object.assign(modal.style, {
        position: 'fixed',
        top: '0', left: '0',
        width: '100vw', height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: '2147483647',
        cursor: 'pointer'
    });

    const image = document.createElement('img');
    image.src = imageSrc;
    Object.assign(image.style, {
        maxWidth: '90%', maxHeight: '90%',
        objectFit: 'contain', cursor: 'default'
    });

    modal.addEventListener('click', () => modal.remove());
    image.addEventListener('click', (e) => e.stopPropagation());

    modal.appendChild(image);
    document.body.appendChild(modal);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case "PING":
            console.log("Content script received PING, sending PONG.");
            sendResponse({ status: "PONG" });
            break;
        case 'SHOW_FULL_SCREEN_IMAGE':
            if (message.src) {
                console.log("Content script received SHOW_FULL_SCREEN_IMAGE.");
                createFullScreenModal(message.src);
                sendResponse({ status: "modal shown" });
            }
            break;
    }
    return true;
});