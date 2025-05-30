// selection_script.js

/**
 * 根據設定的日期、時間和場次名稱，自動選擇並點擊「立即訂購」按鈕。
 * 這個腳本預期在 https://tixcraft.com/activity/game/* 頁面執行。
 */
function selectTicketDateTimeAndOrder() {
    console.log("Attempting to select ticket date and time...");

    chrome.storage.local.get(["tixcraft_settings", "botEnabled"], (data) => {
        const settings = data.tixcraft_settings;
        const botEnabled = data.botEnabled;
        if (!botEnabled) {
            console.log("⏸️ 機器人目前關閉中，跳過搶票流程");
            return;
        }
        if (!settings) {
            console.log("沒有設定，跳過自動導向");
            return;
        }
        const setting = data.tixcraft_settings || {};

        // 從設定中獲取期望的日期 (MM/DD 格式) 和場次名稱
        // setting.date (e.g., "06/08") -> desiredMonthDay
        // setting.name -> desiredShowName

        const desiredMonthDay = setting.date; // 直接使用，因為用戶說只會有 MM/DD 格式
        const desiredShowName = setting.session;
        const dateOrder = setting.dateOrder || "top-down"; // 默認為 "top-down"

        // 如果您希望時間也作為匹配條件，但它不包含在 setting.date 中，
        // 您需要確保它來自另一個設定，或者將其硬編碼。
        // 目前的邏輯只會比對 MM/DD 和場次名稱。


        const gameListTable = document.getElementById('gameList');
        if (!gameListTable) {
            //console.warn("⚠️ 找不到遊戲列表表格 (#gameList)。");
            return;
        }

        let rows = Array.from(gameListTable.querySelectorAll('tbody tr'));
        let foundMatch = false;

        switch (dateOrder) {
            case "bottom-up":
                rows.reverse();
                break;
            case "middle":
                const mid = Math.floor(rows.length / 2);
                rows = [...rows.slice(mid), ...rows.slice(0, mid)];
                break;
            case "top-down":
            default:
                // 保持原本順序
                break;
        }

        // --- 遍歷並查找匹配的場次 ---
        for (const row of rows) {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 4) { // 確保有足夠的列
                const rowDateTimeText = cells[0].textContent.trim(); // 演出時間，例如 "2025/06/08 (日) 19:00"
                const rowShowName = cells[1].textContent.trim();     // 場次名稱

                // 從表格的日期時間文字中提取 MM/DD 部分
                // 範例: "2025/06/08 (日) 19:00" -> 提取 "06/08"
                const rowMonthDayMatch = rowDateTimeText.match(/\d{4}\/(\d{2}\/\d{2})/);
                const rowMonthDay = rowMonthDayMatch ? rowMonthDayMatch[1] : ''; // 獲取第一個捕獲組

                // 檢查提取出的 MM/DD 和場次名稱是否匹配
                const isDateMatch = rowMonthDay.includes(desiredMonthDay); // 包含匹配 MM/DD
                const isShowNameMatch = rowShowName.includes(desiredShowName); // 包含匹配場次名稱

                if (isDateMatch || isShowNameMatch) {
                    console.log(`✅ 找到匹配的場次: ${rowDateTimeText} - ${rowShowName}`);
                    const buyButton = row.querySelector('button.btn-primary[data-href]');
                    if (buyButton) {
                        console.log("🚀 點擊「立即訂購」按鈕。");
                        buyButton.click();
                        foundMatch = true;
                        break; // 找到並點擊後就退出循環
                    } else {
                        //console.warn("⚠️ 找到匹配場次但找不到「立即訂購」按鈕。");
                    }
                }
            }
        }

        if (!foundMatch) {
            //console.warn("⚠️ 未找到符合設定的場次。");
            console.log("❌ 沒有符合條件的場次，準備自動重新整理...");
            setTimeout(() => {
                location.reload();
            }, 100); // 延遲 100ms 避免過度刷新
        }
    });
}

// 頁面載入完成後，執行場次選擇邏輯
// 使用 setTimeout 確保 DOM 完全渲染，尤其是在網路較慢的情況下
const banner = document.querySelector('.event-banner');
if (banner) {
    banner.remove(); // 移除廣告橫幅
}

const gameListTable = document.getElementById('gameList');
let rows = gameListTable.querySelectorAll('tbody tr');
for (const row of rows) {
    const cells = row.querySelectorAll('td');
    if (cells.length >= 4) { // 確保有足夠的列
        const purchaseStatus = cells[3].textContent.trim(); // 第四列是購買狀態
        const eventName = cells[1].textContent.trim();      // 第二列是場次名稱
        if (purchaseStatus.includes('已售完') || purchaseStatus.includes('選購一空')) {
            row.remove(); // 移除已售完的場次
        }
        if (purchaseStatus.includes('MyVideo')) {
            row.remove();
        }
    }
}


console.log(`📊 過濾後剩餘場次數量: ${rows.length}`);
setTimeout(selectTicketDateTimeAndOrder, 5); // 可以根據需要調整延遲時間
