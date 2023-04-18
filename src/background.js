// 读取本地弹幕规则

var filterdata = {};
var linkdata = {};

// 关于兼容firefox和chrome
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
    return chrome.runtime.getManifest();
};

// 更新弹幕规则
function updateFilter(filterlist){
    filterdata = {};
    filterlist.forEach(function (item){
        let name = item[0];
        let regx = item[1];
        let checked = item[2];
        if (checked == 1)
            filterdata[name] = regx;
    });
    console.log("全局变量filterdata已更新");
}

chrome.runtime.onInstalled.addListener(() => {
    console.log('bilimap插件已安装');
});

// 读取用户配置，更新变量
chrome.storage.sync.get({"keylist": []})
      .then(result => {
                updateFilter(result.keylist);
            },
            err => {
                console.log("读取用户配置失败" + err.toString())
            });

// 检测到storage变化自动更新变量
chrome.storage.onChanged.addListener(function (changes, namespace) {
    for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
        if (key == "keylist") {
            updateFilter(newValue);
        }
    }
});

// 向页面注入js脚本
function injectIntoTab(tabid) {
    let comfunc = new CompatibleBrowser();
    let scripts = comfunc.manifest.content_scripts[0].js;
    for(var i = 0 ; i < scripts.length; i++ ) {
        console.log("检测到脚本: ", scripts[i]);
        chrome.scripting.executeScript({target: {tabId: tabid}, files: [scripts[i]]})
              .then(
                (res) => { console.log("脚本执行完毕: ", tabid, res.toString()); },
                (err) => { console.log("脚本注入失败: ", tabid, err.toString()); }
              );
    }
}

// Get all windows
chrome.windows.getAll({populate: true})
      .then(windows => {
                var i = 0, w = windows.length, currentWindow;
                for( ; i < w; i++ ) {
                    currentWindow = windows[i];
                    var j = 0, t = currentWindow.tabs.length, currentTab;
                    for( ; j < t; j++ ) {
                        currentTab = currentWindow.tabs[j];
                        if( currentTab.url.match(/https:\/\/(.+\.)?bilibili.com\/(video|bangumi)/gi) ) {
                            console.log("探测到标签页符合条件: ", currentTab.id);
                            injectIntoTab(currentTab.id);
                        }
                    }
                }
            });

// 接收main.js从网页发来的请求
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log("传送弹幕过滤设置...");
    sendResponse({data: filterdata});
});

// 页面右键菜单
chrome.contextMenus.create({id: "getheadimg",
                            title: "获取封面图片",
                            documentUrlPatterns: ['https://*.bilibili.com/video*', 'https://*.bilibili.com/bangumi*']},
                            () => {void chrome.runtime.lastError;});

// 页面右键菜单
chrome.contextMenus.create({id: "showcharts",
                            title: "展示弹幕地图",
                            documentUrlPatterns: ['https://*.bilibili.com/video*', 'https://*.bilibili.com/bangumi*']},
                            () => {void chrome.runtime.lastError;});

// 页面右键菜单
chrome.contextMenus.create({id: "getavnum",
                            title: "地址栏展示av号码链接",
                            documentUrlPatterns: ['https://*.bilibili.com/video/BV*']},
                            () => {void chrome.runtime.lastError;});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
    switch (info.menuItemId){
        case 'getheadimg':
            chrome.tabs.sendMessage(tab.id, {"act": "getimg"})
                       .then((response) => {
                            console.log("获取到图片地址, 开始下载: " + response.imgurl);
                            if (response.imgurl != undefined)
                                chrome.downloads.download({url: response.imgurl});
                        })
                        .catch(e => {console.log("下载封面的消息出现异常: " + e);});
            break;
        case "showcharts":
            getCurrentTabId(tabid => {
                console.log("注入js到视频页面, 获取页面id信息.");
                chrome.tabs.sendMessage(tabid, {"act": "getcid", "tabid": tabid})
                            .then(resp => {console.log("tab页正在处理展示图表的消息。");})
                            .catch(e => {console.log("展示弹幕图表的消息出现异常: " + e);});
            });
            break;
        case "getavnum":
            chrome.tabs.sendMessage(tab.id, {"act": "copyav"})
                  .then((response) => {console.log("tab页正在处理展示av号的消息。");})
                  .catch(e => {console.log("展示av号的消息出现异常: " + e);});
            break;
    }
});

// 当用户接收关键字建议时触发
chrome.omnibox.onInputEntered.addListener((text) => {
    var reg = /^\d+(\?p\=\d+)?$/;
    console.log("[" + new Date() + "] omnibox event: 已输入: " + text);
    if(!text) return;
    if(reg.test(text)) {
        let burl = `https://www.bilibili.com/av${text}`;
        openUrlCurrentTab(burl);
    }
});

// 获取当前选项卡ID并执行回调
function getCurrentTabId(callback){
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
        var tabid = tabs.length ? tabs[0].id: null;
        console.log("得到当前tab页id: " + tabid.toString());
        if(callback) callback(tabid);
    });
}

// 当前标签打开某个链接
function openUrlCurrentTab(url){
    getCurrentTabId(tabId => {
        chrome.tabs.update(tabId, {url: url});
    });
}
