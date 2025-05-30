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

    (async () => {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'trigger_ocr_autofill' });
            console.log("📸 自動觸發 OCR 響應:", response);
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
            if (response.content_script_response?.status === 'done') {
                if (submitBtn) {
                    setTimeout(() => {
                        submitBtn.click();
                        console.log("🚀 已自動送出表單");
                    }, 5); // 可依需求調整延遲時間（避免太快）
                } else {
                    console.warn("⚠️ 找不到送出按鈕 (.btn-green)");
                }
            }

        } catch (error) {
            console.error("❌ 自動觸發 OCR 發生錯誤:", error);
        }
    })();


});
