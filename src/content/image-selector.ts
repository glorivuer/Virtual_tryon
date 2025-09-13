// This script is injected into the webpage.

const MIN_IMAGE_SIZE = 200; // Minimum width and height for an image to be selectable
const OVERLAY_CLASS_NAME = 'ai-try-on-ext-overlay'; // Unique class name to avoid conflicts

/**
 * Creates and injects CSS for highlighting images directly into the page.
 */
function injectStyles() {
    const styleId = 'ai-try-on-ext-styles';
    if (document.getElementById(styleId)) return; // Avoid injecting styles multiple times

    const css = `
        .${OVERLAY_CLASS_NAME} {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
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
        img.${OVERLAY_CLASS_NAME}-img-relative {
            position: relative;
        }
    `;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = css;
    document.head.appendChild(style);
}

/**
 * Removes all highlights and event listeners created by this script.
 */
function cleanup() {
    document.querySelectorAll(`.${OVERLAY_CLASS_NAME}`).forEach(el => el.remove());
    document.querySelectorAll(`img.${OVERLAY_CLASS_NAME}-img-relative`).forEach(img => {
        img.classList.remove(`${OVERLAY_CLASS_NAME}-img-relative`);
    });
}

/**
 * Handles the click event on a highlighted image.
 * @param event The mouse click event.
 */
function handleImageClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    const target = event.target as HTMLElement;
    const imgElement = target.previousElementSibling as HTMLImageElement;

    if (imgElement && imgElement.src) {
        // Send the selected image URL back to the sidebar script
        chrome.runtime.sendMessage({ type: 'IMAGE_SELECTED', url: imgElement.src });
        cleanup();
    }
}

/**
 * Initializes the image selection process on the page.
 */
function init() {
    cleanup(); // Clean up any previous selections first
    injectStyles();

    const images = Array.from(document.getElementsByTagName('img'));
    for (const img of images) {
        // Check if the image is large enough and visible
        if (img.naturalWidth >= MIN_IMAGE_SIZE && img.naturalHeight >= MIN_IMAGE_SIZE && img.offsetParent !== null) {
            
            // Ensure the image's parent can contain our absolutely positioned overlay
            const parent = img.parentElement;
            if (parent) {
                const parentStyle = window.getComputedStyle(parent);
                if (parentStyle.position === 'static') {
                     img.classList.add(`${OVERLAY_CLASS_NAME}-img-relative`);
                }
            }

            const overlay = document.createElement('div');
            overlay.className = OVERLAY_CLASS_NAME;
            overlay.addEventListener('click', handleImageClick, { once: true });
            
            // Insert overlay after the image within its parent
             if (parent) {
                parent.appendChild(overlay)
                parent.style.position = 'relative';
             }
        }
    }
}

// ==========================================================
// == 核心更新: 全屏模态框逻辑
// ==========================================================
const MODAL_ID = 'ai-try-on-ext-fullscreen-modal';

/**
 * 在主页面上创建并显示一个全屏的图片模态框
 * @param imageSrc - The Base64 data URI of the image.
 */
function createFullScreenModal(imageSrc: string) {
    // 如果已存在，则先移除旧的
    document.getElementById(MODAL_ID)?.remove();

    const modal = document.createElement('div');
    modal.id = MODAL_ID;
    Object.assign(modal.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: '2147483647', // Max z-index
        cursor: 'pointer'
    });

    const image = document.createElement('img');
    image.src = imageSrc;
    Object.assign(image.style, {
        maxWidth: '90%',
        maxHeight: '90%',
        objectFit: 'contain',
        cursor: 'default'
    });

    // 点击模态框背景关闭
    modal.addEventListener('click', () => {
        modal.remove();
    });
    
    // 阻止图片本身的点击事件冒泡到背景上
    image.addEventListener('click', (e) => e.stopPropagation());

    modal.appendChild(image);
    document.body.appendChild(modal);
}

// Listen for a message from the sidebar to cancel the selection
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'CANCEL_SELECTION':
            cleanup();
            sendResponse({ status: "cleaned up" });
            break;
        
        case 'SHOW_FULL_SCREEN_IMAGE':
            if (message.src) {
                createFullScreenModal(message.src);
                sendResponse({ status: "modal shown" });
            }
            break;
    }
});
// Start the process
init();