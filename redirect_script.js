// redirect_script.js

/**
 * 檢查當前網址是否為活動詳情頁，如果是則自動跳轉到搶票頁面。
 */
function redirectToGamePage() {
    const currentUrl = window.location.href;
    // 檢查網址是否包含 '/activity/detail/'
    if (currentUrl.includes('/activity/detail/')) {
        // 直接將 'detail' 替換為 'game'
        const gamePageUrl = currentUrl.replace('/activity/detail/', '/activity/game/');
        
        // 確保替換後的網址與原網址不同，避免不必要的跳轉
        if (gamePageUrl !== currentUrl) {
            console.log(`偵測到活動詳情頁: ${currentUrl}, 自動跳轉到搶票頁面: ${gamePageUrl}`);
            // 使用 replace() 避免在歷史記錄中留下詳情頁，用戶點擊返回不會回到此頁
            window.location.replace(gamePageUrl);
        }
    }
}

// 腳本載入後立即執行跳轉檢查
redirectToGamePage();
