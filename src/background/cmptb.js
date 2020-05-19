// 关于兼容

function CompatibleBrowser(){
    this.browsertype = this.getBrowsertype();
    this.filterdata = {};
    this.linkdata = {};
    this.manifest = this.getManifest();
}

CompatibleBrowser.prototype.getBrowsertype = function() {
    // 判断浏览器
    var userAgent = navigator.userAgent;
    //取得浏览器的userAgent字符串
    if (userAgent.indexOf("Opera") > -1) {
        return "opera"
    }
    if (userAgent.indexOf("Firefox") > -1) {
        return "firefox";
    }
    if (userAgent.indexOf("Chrome") > -1){
        return "chrome";
    }
    if (userAgent.indexOf("Safari") > -1) {
        return "safari";
    }
    return "";
};

CompatibleBrowser.prototype.getManifest = function(){
    if (this.browsertype == "firefox")
        return browser.runtime.getManifest();
    return chrome.app.getDetails();
};


