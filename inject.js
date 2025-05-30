// inject.js
(function() {
    const originalAlert = window.alert;
    window.alert = function(message) {
        console.log("🔥 攔截到 alert:", message);
        if (message.includes("票券已全部售出") || message.includes("目前沒有可以購買的票券") || message.includes("快你一步")|| message.includes("驗證碼不正確")) {
            location.reload();
        } else {
            originalAlert(message);
        }
    };
})();