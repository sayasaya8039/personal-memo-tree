// src/background.ts
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.url) {
    chrome.runtime.sendMessage({
      type: "TAB_CHANGED",
      data: { url: tab.url, title: tab.title, favicon: tab.favIconUrl }
    }).catch(() => {
    });
  }
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    chrome.runtime.sendMessage({
      type: "TAB_UPDATED",
      data: { url: tab.url, title: tab.title, favicon: tab.favIconUrl }
    }).catch(() => {
    });
  }
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_CURRENT_TAB") {
    chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs[0]) {
        sendResponse({
          url: tabs[0].url,
          title: tabs[0].title,
          favicon: tabs[0].favIconUrl
        });
      }
    });
    return true;
  }
});
