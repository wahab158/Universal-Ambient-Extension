import { getBrowser, getFeedbackFormLink } from './libs/utils';

chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason !== 'install' && details.reason !== 'update') return;

  if (chrome.runtime.setUninstallURL) {
    chrome.runtime.setUninstallURL(getFeedbackFormLink());
  }

  if (details.reason === 'install' && getBrowser() === 'Firefox') {
    chrome.runtime.openOptionsPage();
  }
});

chrome.action.onClicked.addListener(function () {
  chrome.runtime.openOptionsPage();
});

// Diagnostics relay: options page -> background -> active tab content script.
// Uses chrome.tabs.query/sendMessage which need no extra permissions because
// we never read tab.url/title here, only the active tab id.
chrome.runtime.onMessage.addListener(function diagnosticsRelay(message, _sender, sendResponse) {
  if (message?.type !== 'ambience:getDiagnostics') return false;

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const tab = tabs && tabs[0];
    if (!tab) {
      sendResponse({ ok: false, error: 'No active tab to query.' });
      return;
    }
    chrome.tabs.sendMessage(tab.id, { type: 'ambience:getDiagnostics' }, function (response) {
      if (chrome.runtime.lastError) {
        sendResponse({
          ok: false,
          error:
            'The page is not injectable or has no ambient engine yet: ' +
            chrome.runtime.lastError.message,
        });
        return;
      }
      sendResponse(response);
    });
  });
  return true; // keep the message channel open for the async sendResponse
});
