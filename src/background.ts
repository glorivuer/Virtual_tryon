// src/background.ts

chrome.runtime.onInstalled.addListener(() => {
  // 默认启用在点击图标时打开侧边栏的功能
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));
});