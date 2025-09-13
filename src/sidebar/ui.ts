// src/sidebar/ui.ts

// --- Element References ---
const uploadView = document.getElementById('upload-view');
const previewView = document.getElementById('preview-view');
const imagePreview = document.getElementById('image-preview') as HTMLImageElement;
const apiKeyInput = document.getElementById('api-key-input') as HTMLInputElement;
const selectApparelButton = document.getElementById('select-apparel-button') as HTMLButtonElement;
const apparelSelectionView = document.getElementById('apparel-selection-view');
const apparelPreviewView = document.getElementById('apparel-preview-view');
const apparelImagePreview = document.getElementById('apparel-image-preview') as HTMLImageElement;
const apparelResultView = document.getElementById('apparel-result-view');
const apparelResultImage = document.getElementById('apparel-result-image') as HTMLImageElement;
const apparelSection = document.getElementById('apparel-section');
const tryOnResultView = document.getElementById('try-on-result-view');
const tryOnResultImage = document.getElementById('try-on-result-image') as HTMLImageElement;
const creativeEditContainer = document.getElementById('creative-edit-section-container');
// This is a fallback for the in-sidebar modal, in case messaging fails
const imageModal = document.getElementById('image-modal');
const modalImage = document.getElementById('modal-image') as HTMLImageElement;


// --- UI Management Functions ---

export function setGeminiButtonLoading(isLoading: boolean): void {
  const geminiGenerateButton = document.getElementById('gemini-generate-button') as HTMLButtonElement;
  if (!geminiGenerateButton) return;

  const buttonText = geminiGenerateButton.querySelector('.button-text') as HTMLSpanElement;
  const spinner = geminiGenerateButton.querySelector('.spinner') as HTMLDivElement;

  if (!buttonText || !spinner) return;

  if (isLoading) {
    geminiGenerateButton.disabled = true;
    buttonText.textContent = 'Generating...';
    spinner.classList.remove('hidden');
  } else {
    geminiGenerateButton.disabled = false;
    buttonText.textContent = 'Generate Full Body (Gemini)';
    spinner.classList.add('hidden');
  }
}

export function setApiKeyValue(apiKey: string): void {
  if (apiKeyInput) {
    apiKeyInput.value = apiKey;
  }
}

export function showImagePreview(base64Image: string): void {
  if (imagePreview && uploadView && previewView) {
    imagePreview.src = base64Image;
    uploadView.classList.add('hidden');
    previewView.classList.remove('hidden');
  }
}

export function showUploadView(): void {
  if (uploadView && previewView && imagePreview) {
    uploadView.classList.remove('hidden');
    previewView.classList.add('hidden');
    imagePreview.src = '';
  }
}

/**
 * Fallback function to open the in-sidebar modal if messaging the content script fails.
 * @param src The image source to display.
 */
export function openImageModal(src: string): void {
  if (modalImage && imageModal) {
    modalImage.src = src;
    imageModal.classList.remove('hidden');
  }
}

/**
 * Fallback function to close the in-sidebar modal.
 */
export function closeImageModal(): void {
  if (imageModal) {
    imageModal.classList.add('hidden');
  }
}

export function initializeUI(storedImage: string | null): void {
  if (storedImage) {
    showImagePreview(storedImage);
  } else {
    showUploadView();
  }
}

export function setApparelSelectionMode(isSelecting: boolean): void {
  if (!selectApparelButton) return;
  if (isSelecting) {
    selectApparelButton.textContent = 'Cancel Selection';
    selectApparelButton.classList.remove('button-primary');
    selectApparelButton.classList.add('button-danger');
  } else {
    selectApparelButton.textContent = 'Select Image from Page';
    selectApparelButton.classList.remove('button-danger');
    selectApparelButton.classList.add('button-primary');
  }
}

export function showApparelPreview(imageUrl: string): void {
  if (apparelImagePreview && apparelSelectionView && apparelPreviewView) {
    apparelImagePreview.src = imageUrl;
    apparelSelectionView.classList.add('hidden');
    apparelPreviewView.classList.remove('hidden');
  }
}

export function setGenerateButtonLoading(isLoading: boolean): void {
  const generateButton = document.getElementById('generate-apparel-button') as HTMLButtonElement;
  if (!generateButton) return;
  
  const buttonText = generateButton.querySelector('.button-text') as HTMLSpanElement;
  const spinner = generateButton.querySelector('.spinner') as HTMLDivElement;
  
  if (!buttonText || !spinner) return;

  if (isLoading) {
    generateButton.disabled = true;
    buttonText.textContent = 'Extracting...';
    spinner.classList.remove('hidden');
  } else {
    generateButton.disabled = false;
    buttonText.textContent = 'Extract Apparel Image';
    spinner.classList.add('hidden');
  }
}

export function showApparelResult(imageUrl: string): void {
  if (apparelPreviewView && apparelResultView && apparelResultImage) {
    apparelResultImage.src = imageUrl;
    apparelPreviewView.classList.add('hidden');
    apparelResultView.classList.remove('hidden');
  }
}

export function hideApparelResult(): void {
  if (apparelPreviewView && apparelResultView) {
    apparelPreviewView.classList.remove('hidden');
    apparelResultView.classList.add('hidden');
  }
}

export function setTryOnButtonLoading(isLoading: boolean): void {
  const tryOnButton = document.getElementById('virtual-try-on-button') as HTMLButtonElement;
  if (!tryOnButton) return;
  
  const buttonText = tryOnButton.querySelector('.button-text') as HTMLSpanElement;
  const spinner = tryOnButton.querySelector('.spinner') as HTMLDivElement;
  
  if (!buttonText || !spinner) return;

  if (isLoading) {
    tryOnButton.disabled = true;
    buttonText.textContent = 'Applying...';
    spinner.classList.remove('hidden');
  } else {
    tryOnButton.disabled = false;
    buttonText.textContent = '✨ Virtual Try-On';
    spinner.classList.add('hidden');
  }
}

export function setRegenerateButtonLoading(isLoading: boolean): void {
  const regenerateButton = document.getElementById('regenerate-button') as HTMLButtonElement;
  if (!regenerateButton) return;
  
  const buttonText = regenerateButton.querySelector('.button-text') as HTMLSpanElement;
  const spinner = regenerateButton.querySelector('.spinner') as HTMLDivElement;
  
  if (!buttonText || !spinner) return;

  if (isLoading) {
    regenerateButton.disabled = true;
    buttonText.textContent = 'Regenerating...';
    spinner.classList.remove('hidden');
} else {
    regenerateButton.disabled = false;
    buttonText.textContent = 'Regenerate';
    spinner.classList.add('hidden');
  }
}

/**
 * Shows the final try-on result and the creative editing section.
 * @param imageUrl Generated image URL or Base64 string.
 */
export function showTryOnResult(imageUrl: string): void {
  if (apparelSection && tryOnResultView && tryOnResultImage && creativeEditContainer) {
    tryOnResultImage.src = imageUrl;
    apparelSection.classList.add('hidden');
    tryOnResultView.classList.remove('hidden');
    creativeEditContainer.classList.remove('hidden'); // Show the edit section
  }
}

/**
 * Resets the UI to the initial apparel selection state, hiding all subsequent views.
 */
export function showApparelSelectionView(): void {
  if (apparelSection && apparelSelectionView && apparelPreviewView && apparelResultView && tryOnResultView && creativeEditContainer && apparelImagePreview) {
    apparelSection.classList.remove('hidden');
    apparelSelectionView.classList.remove('hidden');
    
    apparelPreviewView.classList.add('hidden');
    apparelResultView.classList.add('hidden');
    tryOnResultView.classList.add('hidden');
    creativeEditContainer.classList.add('hidden'); // Hide the edit section

    apparelImagePreview.src = '';
  }
}