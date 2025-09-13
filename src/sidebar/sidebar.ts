// src/sidebar/sidebar.ts

import * as storage from './storage';
import * as ui from './ui';
import { generateFullBodyImage, extractApparelFromImage, performVirtualTryOn, regenerateWithCreativeEdit } from './gemini';

// ===================================================================
// == 重要：请将 'YOUR_IMGBB_API_KEY' 替换为您自己的 imgbb API Key ==
// ===================================================================
const IMGBB_API_KEY = 'YOUR_IMGBB_API_KEY'; 

document.addEventListener('DOMContentLoaded', () => {
    // --- State Variables ---
    let isSelectingApparel = false;
    let generatedApparelImageBase64: string | null = null;
    let currentTryOnImageBase64: string | null = null;
    let uploadedImageUrl: string | null = null;

    // --- Element References ---
    const modelSection = document.getElementById('model-section') as HTMLDivElement;
    const apparelSection = document.getElementById('apparel-section') as HTMLDivElement;
    const tryOnResultView = document.getElementById('try-on-result-view') as HTMLDivElement;
    const uploadButton = document.getElementById('upload-button') as HTMLButtonElement;
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    const clearImageButton = document.getElementById('clear-image-button') as HTMLButtonElement;
    const geminiGenerateButton = document.getElementById('gemini-generate-button') as HTMLButtonElement;
    const saveKeyButton = document.getElementById('save-key-button') as HTMLButtonElement;
    const apiKeyInput = document.getElementById('api-key-input') as HTMLInputElement;
    const selectApparelButton = document.getElementById('select-apparel-button') as HTMLButtonElement;
    const changeApparelButton = document.getElementById('change-apparel-button') as HTMLButtonElement;
    const generateApparelButton = document.getElementById('generate-apparel-button') as HTMLButtonElement;
    const downloadApparelButton = document.getElementById('download-apparel-button') as HTMLButtonElement;
    const backToPreviewButton = document.getElementById('back-to-preview-button') as HTMLButtonElement;
    const apparelCategorySelect = document.getElementById('apparel-category-select') as HTMLSelectElement;
    const virtualTryOnButton = document.getElementById('virtual-try-on-button') as HTMLButtonElement;
    const downloadTryOnButton = document.getElementById('download-try-on-button') as HTMLButtonElement;
    const startOverButton = document.getElementById('start-over-button') as HTMLButtonElement;
    const creativeEditSection = document.getElementById('creative-edit-section') as HTMLDivElement;
    const customBgInput = document.getElementById('custom-bg-input') as HTMLInputElement;
    const angleSelect = document.getElementById('angle-select') as HTMLSelectElement;
    const customPromptInput = document.getElementById('custom-prompt-input') as HTMLTextAreaElement;
    const regenerateButton = document.getElementById('regenerate-button') as HTMLButtonElement;
    const socialLinksContainer = document.querySelector('.social-links') as HTMLDivElement;

     // 【新增】为后备模态框的关闭按钮获取引用
    const modalCloseButton = document.querySelector('.modal-close-button') as HTMLSpanElement;

    // --- Initialization ---
    storage.getUserImage().then(ui.initializeUI);
    storage.getApiKey().then(apiKey => {
        if (apiKey) ui.setApiKeyValue(apiKey);
    });

    // --- Helper Functions ---
    async function getCurrentTab(): Promise<chrome.tabs.Tab> {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || tab.id === undefined) {
            throw new Error("Could not get active tab.");
        }
        return tab;
    }

    async function imageUrlToBase64(url: string): Promise<string> {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    async function uploadImageForSharing(base64Image: string): Promise<string> {
        if (IMGBB_API_KEY === 'YOUR_IMGBB_API_KEY' || !IMGBB_API_KEY) {
            throw new Error('Please configure your imgbb API Key in the sidebar.ts file!');
        }
        const pureBase64 = base64Image.split(',')[1];
        const formData = new FormData();
        formData.append('image', pureBase64);
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            throw new Error('Image upload service failed.');
        }
        const result = await response.json();
        if (result.success && result.data.url) {
            return result.data.url;
        } else {
            throw new Error(`Image upload failed: ${result.error?.message || 'Unknown error'}`);
        }
    }


    async function showFullScreenImage(imageSrc: string) {
        try {
            const tab = await getCurrentTab();
            if (!tab.id || tab.url?.startsWith('chrome://')) {
                throw new Error("Cannot send message to internal Chrome pages.");
            }
            const response = await chrome.tabs.sendMessage(tab.id, { type: "PING" });
            if (response && response.status === "PONG") {
                chrome.tabs.sendMessage(tab.id, {
                    type: 'SHOW_FULL_SCREEN_IMAGE',
                    src: imageSrc
                });
            } else {
                throw new Error("Content script responded unexpectedly.");
            }
        } catch(error) {
            console.warn("Could not connect to content script. Falling back to sidebar modal. Error:", error);
            ui.openImageModal(imageSrc);
        }
    }

    // --- 事件监听器 ---

    // ======================================================
    // == 图片放大点击事件 (使用事件委托)
    // ======================================================
   
    modelSection.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        if (target.tagName === 'IMG' && (target as HTMLImageElement).src) {
            showFullScreenImage((target as HTMLImageElement).src);
        }
    });
    apparelSection.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        if (target.tagName === 'IMG' && (target as HTMLImageElement).src) {
            showFullScreenImage((target as HTMLImageElement).src);
        }
    });
    tryOnResultView.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        if (target.tagName === 'IMG' && (target as HTMLImageElement).src) {
            showFullScreenImage((target as HTMLImageElement).src);
        }
    });

    // 【新增】为后备模态框的关闭按钮绑定事件
    if (modalCloseButton) {
        modalCloseButton.addEventListener('click', ui.closeImageModal);
    }
        // ======================================================
    // == Section 1: 我的试衣模特 & 设置
    // ======================================================
    saveKeyButton.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            storage.saveApiKey(apiKey).then(() => {
                alert('API Key saved!');
            });
        } else {
            alert('Please enter a valid API Key.');
        }
    });

    uploadButton.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        if (target.files && target.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64Image = e.target?.result as string;
                storage.saveUserImage(base64Image).then(() => {
                    ui.showImagePreview(base64Image);
                });
            };
            reader.readAsDataURL(target.files[0]);
        }
    });

    clearImageButton.addEventListener('click', () => {
        storage.clearUserImage().then(() => {
            fileInput.value = '';
            ui.showUploadView();
        });
    });

    geminiGenerateButton.addEventListener('click', async () => {
        const apiKey = await storage.getApiKey();
        if (!apiKey) {
            alert('Please set your Gemini API Key above first!');
            return;
        }
        const currentImage = await storage.getUserImage();
        if (!currentImage) {
            alert('No image found to process.');
            return;
        }
        ui.setGeminiButtonLoading(true);
        try {
            const newImage = await generateFullBodyImage(currentImage, apiKey);
            await storage.saveUserImage(newImage);
            ui.showImagePreview(newImage);
        } catch (error) {
            console.error('Gemini API Error:', error);
            alert(`Image generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            ui.setGeminiButtonLoading(false);
        }
    });

    // ======================================================
    // == Section 2: 选择网页服饰
    // ======================================================
    selectApparelButton.addEventListener('click', async () => {
        try {
            const tab = await getCurrentTab();
            isSelectingApparel = !isSelectingApparel;
            ui.setApparelSelectionMode(isSelectingApparel);
            if (isSelectingApparel) {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id! },
                    files: ['image-selector.js']
                });
            } else {
                await chrome.tabs.sendMessage(tab.id!, { type: 'CANCEL_SELECTION' });
            }
        } catch (error) {
            console.error("Script injection or communication failed:", error);
            alert("Cannot select images on this page. Please try refreshing or using it on another page.");
            isSelectingApparel = false;
            ui.setApparelSelectionMode(false);
        }
    });

    changeApparelButton.addEventListener('click', () => {
        generatedApparelImageBase64 = null;
        ui.showApparelSelectionView();
    });

    generateApparelButton.addEventListener('click', async () => {
        const apiKey = await storage.getApiKey();
        if (!apiKey) {
            alert('Please set your Gemini API Key above first!');
            return;
        }
        const apparelImagePreview = document.getElementById('apparel-image-preview') as HTMLImageElement;
        const imageUrl = apparelImagePreview.src;
        if (!imageUrl) {
            alert('No apparel image found to process.');
            return;
        }
        const category = apparelCategorySelect.value;
        ui.setGenerateButtonLoading(true);
        try {
            const base64Image = await imageUrlToBase64(imageUrl);
            const resultImage = await extractApparelFromImage(base64Image, category, apiKey);
            generatedApparelImageBase64 = resultImage;
            ui.showApparelResult(resultImage);
        } catch (error) {
            console.error('Apparel Extraction Error:', error);
            alert(`Apparel extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            ui.setGenerateButtonLoading(false);
        }
    });

    downloadApparelButton.addEventListener('click', () => {
        const apparelResultImage = document.getElementById('apparel-result-image') as HTMLImageElement;
        const imageUrl = apparelResultImage.src;
        if (!imageUrl) return;
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `generated-apparel-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    backToPreviewButton.addEventListener('click', () => ui.hideApparelResult());

    // ======================================================
    // == Section 3: 虚拟试穿 & 创意编辑
    // ======================================================
    virtualTryOnButton.addEventListener('click', async () => {
        const apiKey = await storage.getApiKey();
        if (!apiKey) {
            alert('Please set your Gemini API Key above first!');
            return;
        }
        const modelImage = await storage.getUserImage();
        const apparelImage = generatedApparelImageBase64; 
        if (!modelImage || !apparelImage) {
            alert('Error: Missing model or apparel image data. Please go back and retry.');
            return;
        }
        ui.setTryOnButtonLoading(true);
        try {
            const resultImage = await performVirtualTryOn(modelImage, apparelImage, apiKey);
            currentTryOnImageBase64 = resultImage;
            uploadedImageUrl = null;
            ui.showTryOnResult(resultImage);
        } catch (error) {
            console.error('Virtual Try-On Error:', error);
            alert(`Virtual try-on failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            ui.setTryOnButtonLoading(false);
        }
    });

    downloadTryOnButton.addEventListener('click', () => {
        const tryOnResultImage = document.getElementById('try-on-result-image') as HTMLImageElement;
        const imageUrl = tryOnResultImage.src;
        if (!imageUrl) return;
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `virtual-try-on-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    startOverButton.addEventListener('click', () => {
        generatedApparelImageBase64 = null;
        currentTryOnImageBase64 = null;
        uploadedImageUrl = null;
        document.querySelectorAll('.preset-button.active').forEach(b => b.classList.remove('active'));
        customBgInput.value = '';
        customBgInput.disabled = true;
        customBgInput.placeholder = "Click 'Custom' above to enter a scene";
        angleSelect.selectedIndex = 0;
        customPromptInput.value = '';
        ui.showApparelSelectionView();
    });

    creativeEditSection.addEventListener('click', (event) => {
        const target = event.target as HTMLButtonElement;
        if (!target.classList.contains('preset-button')) return;
        document.querySelectorAll('.preset-button[data-type="background"], .preset-button[data-type="custom-bg"]').forEach(btn => {
            btn.classList.remove('active');
        });
        const dataType = target.dataset.type;
        if (dataType === 'background') {
            const prompt = target.dataset.prompt;
            if (prompt) {
                customBgInput.value = prompt;
                customBgInput.disabled = true;
                target.classList.add('active');
            }
        } else if (dataType === 'custom-bg') {
            customBgInput.value = '';
            customBgInput.disabled = false;
            customBgInput.placeholder = "Enter custom scene, e.g., 'at the beach'";
            customBgInput.focus();
            target.classList.add('active');
        }
    });

    regenerateButton.addEventListener('click', async () => {
        const apiKey = await storage.getApiKey();
        if (!apiKey || !currentTryOnImageBase64) {
            alert('Missing API Key or base image. Cannot regenerate.');
            return;
        }
        let creativePrompts: string[] = [];
        const background = customBgInput.value.trim();
        const angle = angleSelect.value.trim();
        const custom = customPromptInput.value.trim();
        if (background) creativePrompts.push(`Change the background to: ${background}.`);
        if (angle) creativePrompts.push(`Change the model's pose and camera angle to: ${angle}.`);
        if (custom) creativePrompts.push(custom);
        if (creativePrompts.length === 0) {
            alert('Please enter or select at least one creative instruction!');
            return;
        }
        const finalCreativePrompt = creativePrompts.join(' ');
        ui.setRegenerateButtonLoading(true);
        try {
            const newImage = await regenerateWithCreativeEdit(currentTryOnImageBase64, finalCreativePrompt, apiKey);
            currentTryOnImageBase64 = newImage;
            uploadedImageUrl = null;
            const tryOnResultImage = document.getElementById('try-on-result-image') as HTMLImageElement;
            tryOnResultImage.src = newImage;
        } catch (error) {
            console.error('Creative Regeneration Error:', error);
            alert(`Creative regeneration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            ui.setRegenerateButtonLoading(false);
        }
    });
    
    socialLinksContainer.addEventListener('click', async (event) => {
        event.preventDefault();
        const target = (event.target as HTMLElement).closest('.social-link') as HTMLAnchorElement;
        if (!target || target.classList.contains('disabled')) return;
        if (!currentTryOnImageBase64) {
            alert('No image available to share.');
            return;
        }
        try {
            if (!uploadedImageUrl) {
                alert('Uploading image for first share, please wait...');
                uploadedImageUrl = await uploadImageForSharing(currentTryOnImageBase64);
            }
            const textToShare = encodeURIComponent('Check out my new look! Generated by the AI Virtual Try-On Chrome extension.');
            const urlToShare = encodeURIComponent(uploadedImageUrl);
            let shareUrl = '';
            switch (target.id) {
                case 'share-twitter':
                    shareUrl = `https://twitter.com/intent/tweet?text=${textToShare}&url=${urlToShare}`;
                    break;
                case 'share-pinterest':
                    shareUrl = `https://pinterest.com/pin/create/button/?url=${urlToShare}&media=${urlToShare}&description=${textToShare}`;
                    break;
                case 'share-facebook':
                    shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${urlToShare}`;
                    break;
                default:
                    return;
            }
            chrome.tabs.create({ url: shareUrl });
        } catch (error) {
            console.error('Share preparation failed:', error);
            alert(`Share failed: ${(error as Error).message}`);
        }
    });

    // ======================================================
    // == 全局消息监听器 (来自内容脚本)
    // ======================================================
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'IMAGE_SELECTED' && message.url) {
            ui.showApparelPreview(message.url);
            isSelectingApparel = false;
            ui.setApparelSelectionMode(false);
            sendResponse({ status: "ok" }); 
        }
         return true; // Keep this true for async sendResponse
    });
});