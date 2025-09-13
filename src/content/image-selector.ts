// src/content/image-selector.ts

const MIN_IMAGE_SIZE = 200;
const OVERLAY_CLASS_NAME = 'ai-try-on-ext-overlay';

function injectStyles() {
    const styleId = 'ai-try-on-ext-styles';
    if (document.getElementById(styleId)) return;
    const css = `
        .${OVERLAY_CLASS_NAME} {
            position: absolute;
            background-color: rgba(255, 0, 0, 0.3);
            border: 2px solid red;
            cursor: pointer;
            z-index: 99999;
            box-sizing: border-box;
            transition: background-color 0.2s;
        }
        .${OVERLAY_CLASS_NAME}:hover {
            background-color: rgba(255, 0, 0, 0.5);
        }
    `;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = css;
    document.head.appendChild(style);
}

function cleanup() {
    document.querySelectorAll(`.${OVERLAY_CLASS_NAME}`).forEach(el => el.remove());
}

function handleImageClick(event: MouseEvent, imgElement: HTMLImageElement) {
    event.preventDefault();
    event.stopPropagation();
    if (imgElement && imgElement.src) {
        chrome.runtime.sendMessage({ type: 'IMAGE_SELECTED', url: imgElement.src });
        cleanup();
    }
}

function init() {
    cleanup();
    injectStyles();
    const images = Array.from(document.getElementsByTagName('img'));
    for (const img of images) {
        if (img.naturalWidth >= MIN_IMAGE_SIZE && img.naturalHeight >= MIN_IMAGE_SIZE && img.offsetParent !== null) {
            const parent = img.parentElement;
            if (parent) {
                const overlay = document.createElement('div');
                overlay.className = OVERLAY_CLASS_NAME;
                overlay.style.position = 'absolute';
                overlay.style.top = `${img.offsetTop}px`;
                overlay.style.left = `${img.offsetLeft}px`;
                overlay.style.width = `${img.offsetWidth}px`;
                overlay.style.height = `${img.offsetHeight}px`;
                overlay.addEventListener('click', (event) => handleImageClick(event, img), { once: true });
                parent.style.position = parent.style.position || 'relative';
                parent.appendChild(overlay);
            }
        }
    }
}

// 这个监听器现在只关心“取消选择”
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'CANCEL_SELECTION') {
        cleanup();
        sendResponse({ status: "cleaned up" });
    }
});

init();