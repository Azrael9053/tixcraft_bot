// ✅ 模擬使用者點擊（取代 .click()）
function simulateClick(element) {
    const event = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window
    });
    element.dispatchEvent(event);
}

// ✅ 主搶票程式
function startTicketScript() {
    chrome.storage.local.get(["tixcraft_settings", "botEnabled"], (data) => {
        const setting = data.tixcraft_settings;
        const botEnabled = data.botEnabled;

        if (!botEnabled) {
            console.log("⏸️ 機器人目前關閉中，跳過搶票流程");
            return;
        }

        const nameKeywords = (setting.name || "").split(/\s+/).filter(Boolean);
        const priceKeywords = (setting.price || "").split(/\s+/).filter(Boolean);

        const aTags = Array.from(document.querySelectorAll('.zone.area-list a'));
        let found = false;

        switch (setting.priceOrder) {
            case "bottom-up":
                aTags.reverse();
                break;
            case "middle":
                const mid = Math.floor(aTags.length / 2);
                aTags = [...aTags.slice(mid), ...aTags.slice(0, mid)];
                break;
            case "top-down":
            default:
                // 保持原本順序
                break;
        }

        for (const aTag of aTags) {
            const text = aTag.textContent.trim().replace(/\s+/g, '');
            const matchName = nameKeywords.length === 0 || nameKeywords.some(keyword => text.includes(keyword));
            const matchPrice = priceKeywords.length === 0 || priceKeywords.some(keyword => text.includes(keyword));

            if (matchName || matchPrice) {
                console.log("✅ 符合票區：", text);
                found = true;

                // 模擬點擊票區
                simulateClick(aTag);
                console.log("🎯 點擊票區完成");

                // 不重複點選多個區域
                break;
            }
        }

        if (!found && setting.autoReload) {
            console.log("❌ 沒有符合條件的票，準備自動重新整理...");
            setTimeout(() => {
                location.reload();
            }, 100); // 延遲 100ms 避免過度刷新
        }
    });
}


function removeUnwantedZones() {
    const zoneContainer = document.querySelector('.zone.area-list');
    if (!zoneContainer) return;

    const keywordsToExclude = ['已售完', '身障', '無障礙', '輪椅'];

    const zoneGroups = zoneContainer.querySelectorAll('ul');
    zoneGroups.forEach((ul) => {
        const lis = ul.querySelectorAll('li');
        lis.forEach((li) => {
            const text = li.textContent.trim();
            const shouldRemove = keywordsToExclude.some(keyword => text.includes(keyword));
            if (shouldRemove) {
                li.remove();
                console.log('🚫 已移除區塊：', text);
            }
        });
    });
}



function injectScript(filePath) {
    const script = document.createElement("script");
    script.setAttribute("type", "text/javascript");
    script.src = chrome.runtime.getURL(filePath);  // 動態取得正確路徑
    document.documentElement.appendChild(script);
    script.remove();
}

injectScript("inject.js");


// ✅ 等待票種載入才執行主程式
const checkExist = setInterval(() => {
    const zoneContainer = document.querySelector('.zone.area-list');
    if (zoneContainer) {
        console.log("✅ 搶票頁面載入完成，開始搶票");
        clearInterval(checkExist);
        removeUnwantedZones();
        startTicketScript();
    } else {
        console.log("⌛ 等待票種載入中...");
    }
}, 300);
