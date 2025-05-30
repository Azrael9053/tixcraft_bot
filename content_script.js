// content_script.js

/**
 * Helper function to draw image on canvas and get Base64.
 * @param {HTMLImageElement} img The image element.
 * @returns {string} Base64 data of the image.
 */
function processImageToCanvas(img) {
    let image_data = "";
    let canvas = document.createElement('canvas');
    let context = canvas.getContext('2d');

    // 確保 canvas 尺寸與圖片一致
    canvas.height = img.naturalHeight;
    canvas.width = img.naturalWidth;

    try {
        context.drawImage(img, 0, 0);
        // toDataURL 默認是 PNG 格式，你可以根據需要更改為 'image/jpeg' 等
        let img_data_url = canvas.toDataURL('image/png');

        if (img_data_url) {
            // 移除 "data:image/png;base64," 前綴
            image_data = img_data_url.split(",")[1];
            console.log("Image Base64 data extracted (first 50 chars):", image_data.substring(0, 50) + "...");
        } else {
            console.warn("canvas.toDataURL() returned empty string, image might not be fully loaded or drawn.");
        }
    } catch (e) {
        console.error("Error drawing image to canvas or getting data URL:", e);
    }
    return image_data;
}

/**
 * 從頁面中獲取驗證碼圖片的 Base64 數據。
 * @returns {Promise<string>} 圖片的 Base64 數據 (不包含 "data:image/png;base64," 前綴)，如果找不到圖片或加載失敗則返回空字符串。
 */
async function get_ocr_image() {
    console.log("Attempting to get OCR image from page...");
    let image_id = 'TicketForm_verifyCode-image';
    let img = document.getElementById(image_id);

    // 如果沒有通過 ID 找到，嘗試使用其他選擇器 (常見的類名或 alt 屬性)
    if (!img) {
        img = document.querySelector('img.captcha-image');
        if (!img) {
            img = document.querySelector('img[alt="驗證碼"]');
        }
    }

    if (img != null) {
        console.log("Found image element:", img);

        // 檢查圖片是否已經載入完成
        if (img.complete && img.naturalHeight !== 0) {
            console.log("Image already loaded.");
            return processImageToCanvas(img);
        } else {
            // 如果圖片尚未載入，則等待 onload 事件
            return new Promise((resolve) => {
                img.onload = () => {
                    console.log("Image loaded via onload event.");
                    resolve(processImageToCanvas(img));
                };
                img.onerror = (error) => {
                    console.error("Error loading captcha image:", error);
                    resolve(""); // 載入失敗時返回空字串
                };
                // 如果圖片的 src 屬性在 onload 之後被改變，onload 事件會再次觸發。
                // 對於靜態驗證碼，這應該沒問題。
                // 如果圖片已經處於損壞狀態，onerror 會觸發。
            });
        }
    } else {
        console.warn("Captcha image element not found with ID 'TicketForm_verifyCode-image' or common selectors.");
        return "";
    }
}

/**
 * 向背景腳本發送請求，獲取 OCR 答案。
 * @param {string} api_url OCR 伺服器的基礎 URL (例如 'http://127.0.0.1:16888/').
 * @param {string} image_data 驗證碼圖片的 Base64 數據。
 * @returns {Promise<string>} 識別出的驗證碼文字。
 */
async function tixcraft_get_ocr_answer(api_url, image_data) {
    if (!image_data) {
        console.error("No image data to send for OCR.");
        return "";
    }

    let bundle = {
        action: 'ocr',
        data: {
            'url': api_url + 'ocr', // 假設你的 OCR 接口是 /ocr
            'image_data': image_data,
        }
    };

    console.log("Sending OCR request to background script...");
    try {
        const return_answer = await chrome.runtime.sendMessage(bundle);
        console.log("Received OCR response from background script:", return_answer);
        if (return_answer && return_answer.ocr_text) {
            return return_answer.ocr_text;
        } else if (return_answer && return_answer.error) {
            console.error("OCR API error:", return_answer.error);
            return "";
        } else {
            console.error("Unexpected OCR response format:", return_answer);
            return "";
        }
    } catch (error) {
        console.error("Error communicating with background script for OCR:", error);
        return "";
    }
}

/**
 * 自動填寫驗證碼並執行後續操作。
 */
async function autoFillCaptchaAndProceed() {
    console.log("Attempting to auto-fill captcha and proceed...");
    // 等待圖片完全載入並獲取 Base64 數據
    const image_base64 = await get_ocr_image();
    if (image_base64) {
        chrome.storage.local.get("tixcraft_settings", async (data) => {
            const ocrApiUrl = (data.tixcraft_settings && data.tixcraft_settings.ocrApiUrl) || "";
            if (!ocrApiUrl) {
                console.error("尚未設定 OCR API 網址");
                return;
            }
            const ocr_text = await tixcraft_get_ocr_answer(ocrApiUrl, image_base64);

            if (ocr_text) {
                // 找到驗證碼輸入框
                const captcha_input_id = 'TicketForm_verifyCode';
                let captcha_input = document.getElementById(captcha_input_id);

                if (!captcha_input) {
                    captcha_input = document.querySelector('input.captcha-input-class');
                    if (!captcha_input) {
                        captcha_input = document.querySelector('input[name="captcha_code"]');
                    }
                }

                if (captcha_input) {
                    captcha_input.value = ocr_text;
                    console.log("Captcha filled:", ocr_text);
                    captcha_input.dispatchEvent(new Event('input', { bubbles: true }));
                    captcha_input.dispatchEvent(new Event('change', { bubbles: true }));

                    // 勾選同意條款
                    const agreeCheckbox = document.querySelector('#TicketForm_agree');
                    if (agreeCheckbox && !agreeCheckbox.checked) {
                        agreeCheckbox.checked = true;
                        const inputEvent = new Event('input', { bubbles: true });
                        agreeCheckbox.dispatchEvent(inputEvent);
                        console.log("☑️ 已自動勾選同意條款");
                    }

                    // 提交表單
                    const submitBtn = document.querySelector('button.btn.btn-primary.btn-green');
                    if (submitBtn) {
                        // 延遲提交，確保所有 UI 更新和事件處理完成
                        setTimeout(() => {
                            submitBtn.click();
                            console.log("🚀 已自動送出表單");
                        }, 3);
                    } else {
                        console.warn("⚠️ 找不到送出按鈕 (.btn-green)");
                    }
                } else {
                    console.error("Captcha input field not found with ID 'TicketForm_verifyCode' or common selectors.");
                }
            }
        });
    } else {
        console.error("Failed to get image Base64 data, cannot proceed with OCR.");
    }
}

function injectScript(filePath) {
    const script = document.createElement("script");
    script.setAttribute("type", "text/javascript");
    script.src = chrome.runtime.getURL(filePath);  // 動態取得正確路徑
    (document.head || document.documentElement).appendChild(script);
    // document.documentElement.appendChild(script);
    // script.remove();
}

injectScript("inject.js");


// 在頁面加載完成後自動執行票數選擇和觸發 OCR 流程
chrome.storage.local.get(["tixcraft_settings"], (data) => {
    const setting = data.tixcraft_settings || {};
    const desiredCount = setting.count || 1;

    // 選擇票數
    const selectEl = document.querySelector('select[id^="TicketForm_ticketPrice_"]');
    if (selectEl) {
        selectEl.value = String(desiredCount);
        const changeEvent = new Event('change', { bubbles: true });
        selectEl.dispatchEvent(changeEvent);
        console.log(`🎫 已選擇 ${desiredCount} 張票`);
    } else {
        console.warn("⚠️ 找不到票數下拉選單 (#TicketForm_ticketPrice_02)");
    }

    // 延遲觸發 OCR，確保頁面元素完全渲染且圖片有時間載入
    setTimeout(autoFillCaptchaAndProceed, 1); // 這裡可以調整延遲時間，例如增加到 1ms 或更多
});
