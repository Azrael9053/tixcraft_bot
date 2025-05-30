chrome.runtime.onInstalled.addListener(() => {
    chrome.action.setBadgeText({ text: "OFF" });
    chrome.action.setBadgeBackgroundColor({ color: "#d9534f" });
    chrome.storage.local.set({ botEnabled: false });
});

chrome.commands.onCommand.addListener((command) => {
    if (command === "toggle-bot") {
        chrome.storage.local.get("botEnabled", (data) => {
            const newStatus = !data.botEnabled;
            chrome.storage.local.set({ botEnabled: newStatus });

            chrome.action.setBadgeText({ text: newStatus ? "ON" : "OFF" });
            chrome.action.setBadgeBackgroundColor({
                color: newStatus ? "#5cb85c" : "#d9534f"
            });

            if (newStatus) {
                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    if (tabs.length > 0) {
                        chrome.tabs.reload(tabs[0].id);
                    }
                });

            }
        });
    }
});

// background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'ocr' && request.data && request.data.url && request.data.image_data) {
        const apiUrl = request.data.url;
        const imageData = request.data.image_data;

        console.log(`Background script: Sending OCR request to ${apiUrl}`);
        
        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image_data: imageData }) // 發送 JSON 格式的數據
        })
        .then(response => {
            if (!response.ok) {
                // 處理 HTTP 錯誤狀態碼
                return response.text().then(text => {
                    throw new Error(`HTTP error! Status: ${response.status}, Body: ${text}`);
                });
            }
            return response.json(); // 假設你的 OCR 服務器返回 JSON
        })
        .then(data => {
            console.log("Background script: OCR server response:", data);
            // 假設你的 OCR 服務器返回的 JSON 中，OCR 結果在 'answer' 字段
            if (data && data.answer) {
                sendResponse({ ocr_text: data.answer });
            } else {
                sendResponse({ error: 'OCR server response did not contain "answer" field or was empty.' });
            }
        })
        .catch(error => {
            console.error("Background script: Error during OCR fetch:", error);
            sendResponse({ error: error.message || 'Unknown error during OCR request.' });
        });

        return true; // 表示將異步發送響應
    }
    // 你可以添加其他消息處理邏輯，例如從 popup.js 發送的觸發消息
    else if (request.action === 'trigger_ocr_autofill_from_popup') {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'trigger_ocr_autofill' }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error("Error sending message to content script:", chrome.runtime.lastError.message);
                        sendResponse({ status: 'error', message: chrome.runtime.lastError.message });
                    } else {
                        console.log("Trigger sent to content script, response:", response);
                        sendResponse({ status: 'triggered', content_script_response: response });
                    }
                });
            } else {
                sendResponse({ status: 'error', message: 'No active tab found.' });
            }
        });
        return true; // 非同步響應
    }
});
