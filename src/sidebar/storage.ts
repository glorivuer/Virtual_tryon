// src/sidebar/storage.ts

const USER_IMAGE_KEY = 'user-photo-base64';
const GEMINI_API_KEY = 'gemini-api-key'; // 新增

/**
 * 将用户的照片（Base64 格式）保存到本地存储
 * @param base64Image 图片的 Base64 字符串
 */
export async function saveUserImage(base64Image: string): Promise<void> {
  await chrome.storage.local.set({ [USER_IMAGE_KEY]: base64Image });
}

/**
 * 从本地存储中读取用户照片
 * @returns 返回存储的 Base64 字符串，如果不存在则返回 null
 */
export async function getUserImage(): Promise<string | null> {
  const result = await chrome.storage.local.get(USER_IMAGE_KEY);
  return result[USER_IMAGE_KEY] || null;
}

/**
 * 从本地存储中清除用户照片
 */
export async function clearUserImage(): Promise<void> {
  await chrome.storage.local.remove(USER_IMAGE_KEY);
}

// --- 新增 API Key 管理函数 ---

/**
 * 保存 Gemini API Key
 * @param apiKey 用户的 API Key
 */
export async function saveApiKey(apiKey: string): Promise<void> {
  await chrome.storage.local.set({ [GEMINI_API_KEY]: apiKey });
}

/**
 * 获取 Gemini API Key
 * @returns 返回存储的 API Key，如果不存在则返回 null
 */
export async function getApiKey(): Promise<string | null> {
  const result = await chrome.storage.local.get(GEMINI_API_KEY);
  return result[GEMINI_API_KEY] || null;
}