// src/sidebar/sidebar.ts

import * as storage from './storage';
import * as ui from './ui';
import { generateFullBodyImage, extractApparelFromImage, performVirtualTryOn, regenerateWithCreativeEdit } from './gemini';

// ===================================================================
// == 重要：请将 'YOUR_IMGBB_API_KEY' 替换为您自己的 imgbb API Key ==
// ===================================================================
const IMGBB_API_KEY = 'a6d210a0e9d6275ad39c1d2884a7b84f'; 

document.addEventListener('DOMContentLoaded', () => {
    // --- State Variables ---
    let isSelectingApparel = false;
    let generatedApparelImageBase64: string | null = null;
    let currentTryOnImageBase64: string | null = null;
    let uploadedImageUrl: string | null = null;

    // --- Element References ---
    const uploadButton = document.getElementById('upload-button') as HTMLButtonElement;
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    const clearImageButton = document.getElementById('clear-image-button') as HTMLButtonElement;
    const imagePreview = document.getElementById('image-preview') as HTMLImageElement;
    const geminiGenerateButton = document.getElementById('gemini-generate-button') as HTMLButtonElement;
    const saveKeyButton = document.getElementById('save-key-button') as HTMLButtonElement;
    const apiKeyInput = document.getElementById('api-key-input') as HTMLInputElement;
    const selectApparelButton = document.getElementById('select-apparel-button') as HTMLButtonElement;
    const changeApparelButton = document.getElementById('change-apparel-button') as HTMLButtonElement;
    const apparelImagePreview = document.getElementById('apparel-image-preview') as HTMLImageElement;
    const apparelResultImage = document.getElementById('apparel-result-image') as HTMLImageElement;
    const generateApparelButton = document.getElementById('generate-apparel-button') as HTMLButtonElement;
    const downloadApparelButton = document.getElementById('download-apparel-button') as HTMLButtonElement;
    const backToPreviewButton = document.getElementById('back-to-preview-button') as HTMLButtonElement;
    const apparelCategorySelect = document.getElementById('apparel-category-select') as HTMLSelectElement;
    const virtualTryOnButton = document.getElementById('virtual-try-on-button') as HTMLButtonElement;
    const tryOnResultImage = document.getElementById('try-on-result-image') as HTMLImageElement;
    const downloadTryOnButton = document.getElementById('download-try-on-button') as HTMLButtonElement;
    const startOverButton = document.getElementById('start-over-button') as HTMLButtonElement;
    const creativeEditSection = document.getElementById('creative-edit-section') as HTMLDivElement;
    const customBgInput = document.getElementById('custom-bg-input') as HTMLInputElement;
    const angleSelect = document.getElementById('angle-select') as HTMLSelectElement;
    const customPromptInput = document.getElementById('custom-prompt-input') as HTMLTextAreaElement;
    const regenerateButton = document.getElementById('regenerate-button') as HTMLButtonElement;
    const socialLinksContainer = document.querySelector('.social-links') as HTMLDivElement;

    // --- 初始化 ---
    storage.getUserImage().then(ui.initializeUI);
    storage.getApiKey().then(apiKey => {
        if (apiKey) ui.setApiKeyValue(apiKey);
    });

    // --- 辅助函数 ---
    async function getCurrentTab(): Promise<chrome.tabs.Tab> {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab || tab.id === undefined) {
            throw new Error("无法获取活动的标签页。");
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
        
        const pureBase64 = base64Image.split(',')[1];
        const formData = new FormData();
        formData.append('image', pureBase64);
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            throw new Error('图片上传服务失败。');
        }
        const result = await response.json();
        if (result.success && result.data.url) {
            return result.data.url;
        } else {
            throw new Error(`图片上传失败: ${result.error?.message || '未知错误'}`);
        }
    }

    /**
     * 【新增】辅助函数：向内容脚本发送消息以显示全屏图片
     * @param imageSrc - The Base64 data URI of the image to show.
     */
    async function showFullScreenImage(imageSrc: string) {
        try {
            const tab = await getCurrentTab();
            if (tab.id) {
                chrome.tabs.sendMessage(tab.id, {
                    type: 'SHOW_FULL_SCREEN_IMAGE',
                    src: imageSrc
                });
            }
        } catch(error) {
            console.error("无法发送消息到内容脚本:", error);
            // Fallback: show the old, small modal if messaging fails
            ui.openImageModal(imageSrc);
        }
    }

    // --- 事件监听器 ---

    // ======================================================
    // == Section 1: 我的试衣模特 & 设置
    // ======================================================
    saveKeyButton.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            storage.saveApiKey(apiKey).then(() => {
                alert('API Key 已保存！');
            });
        } else {
            alert('请输入有效的 API Key。');
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
    // 【更新】图片点击事件
    imagePreview.addEventListener('click', () => { if (imagePreview.src) showFullScreenImage(imagePreview.src); });
    geminiGenerateButton.addEventListener('click', async () => {
        const apiKey = await storage.getApiKey();
        if (!apiKey) {
            alert('请先在上方设置您的 Gemini API Key！');
            return;
        }
        const currentImage = await storage.getUserImage();
        if (!currentImage) {
            alert('未找到需要处理的图片。');
            return;
        }
        ui.setGeminiButtonLoading(true);
        try {
            const newImage = await generateFullBodyImage(currentImage, apiKey);
            await storage.saveUserImage(newImage);
            ui.showImagePreview(newImage);
        } catch (error) {
            console.error('Gemini API Error:', error);
            alert(`图片生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
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
            console.error("脚本注入或通信失败:", error);
            alert("无法在此页面上选择图片。请尝试刷新页面或在其他页面上使用。");
            isSelectingApparel = false;
            ui.setApparelSelectionMode(false);
        }
    });
    // 【更新】图片点击事件
    apparelImagePreview.addEventListener('click', () => { if (apparelImagePreview.src) showFullScreenImage(apparelImagePreview.src); });
    changeApparelButton.addEventListener('click', () => {
        generatedApparelImageBase64 = null;
        ui.showApparelSelectionView();
    });
    generateApparelButton.addEventListener('click', async () => {
        const apiKey = await storage.getApiKey();
        if (!apiKey) {
            alert('请先在上方设置您的 Gemini API Key！');
            return;
        }
        const imageUrl = apparelImagePreview.src;
        if (!imageUrl) {
            alert('未找到需要处理的服饰图片。');
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
            alert(`服饰提取失败: ${error instanceof Error ? error.message : '未知错误'}`);
        } finally {
            ui.setGenerateButtonLoading(false);
        }
    });
    // 【更新】图片点击事件
    apparelResultImage.addEventListener('click', () => { if (apparelResultImage.src) showFullScreenImage(apparelResultImage.src); });
    downloadApparelButton.addEventListener('click', () => {
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
            alert('请先在上方设置您的 Gemini API Key！');
            return;
        }
        const modelImage = await storage.getUserImage();
        const apparelImage = generatedApparelImageBase64; 
        if (!modelImage || !apparelImage) {
            alert('错误：缺少模特或服饰图片数据。请返回并重试。');
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
            alert(`虚拟试穿失败: ${error instanceof Error ? error.message : '未知错误'}`);
        } finally {
            ui.setTryOnButtonLoading(false);
        }
    });
    // 【更新】图片点击事件
    tryOnResultImage.addEventListener('click', () => { if (tryOnResultImage.src) showFullScreenImage(tryOnResultImage.src); });
    downloadTryOnButton.addEventListener('click', () => {
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
        customBgInput.placeholder = '点击上方“自定义”后输入场景';
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
            customBgInput.placeholder = "请输入自定义场景, e.g., 'at the beach'";
            customBgInput.focus();
            target.classList.add('active');
        }
    });
    regenerateButton.addEventListener('click', async () => {
        const apiKey = await storage.getApiKey();
        if (!apiKey || !currentTryOnImageBase64) {
            alert('缺少 API Key 或基础图片，无法重新生成。');
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
            alert('请输入或选择至少一个创意指令！');
            return;
        }
        const finalCreativePrompt = creativePrompts.join(' ');
        ui.setRegenerateButtonLoading(true);
        try {
            const newImage = await regenerateWithCreativeEdit(currentTryOnImageBase64, finalCreativePrompt, apiKey);
            currentTryOnImageBase64 = newImage;
            uploadedImageUrl = null;
            tryOnResultImage.src = newImage;
        } catch (error) {
            console.error('Creative Regeneration Error:', error);
            alert(`创意生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
        } finally {
            ui.setRegenerateButtonLoading(false);
        }
    });
    socialLinksContainer.addEventListener('click', async (event) => {
        event.preventDefault();
        const target = (event.target as HTMLElement).closest('.social-link') as HTMLAnchorElement;
        if (!target || target.classList.contains('disabled')) return;
        if (!currentTryOnImageBase64) {
            alert('没有可分享的图片。');
            return;
        }
        try {
            if (!uploadedImageUrl) {
                alert('首次分享需要上传图片，请稍候...');
                uploadedImageUrl = await uploadImageForSharing(currentTryOnImageBase64);
            }
            const textToShare = encodeURIComponent('看看我的新造型！这是由AI虚拟试衣间Chrome扩展生成的。');
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
            console.error('分享准备失败:', error);
            alert(`分享失败: ${(error as Error).message}`);
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
    });
});