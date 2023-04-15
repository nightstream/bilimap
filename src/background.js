// 读取本地弹幕规则

let filterdata = {};
let linkdata = {};

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
    console.log('插件已安装');
});

// 读取用户配置，更新变量
chrome.storage.sync.get({"keylist": []}, function(result) {
    updateFilter(result.keylist);
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
        chrome.scripting.executeScript({target: {tabId: tabid}, files: [scripts[i]]},
                                       () => { console.log("脚本执行完毕: ", tabid) });
    }
}

// Get all windows
chrome.windows.getAll({populate: true}, function (windows) {
    var i = 0, w = windows.length, currentWindow;
    for( ; i < w; i++ ) {
        currentWindow = windows[i];
        var j = 0, t = currentWindow.tabs.length, currentTab;
        for( ; j < t; j++ ) {
            currentTab = currentWindow.tabs[j];
            if( currentTab.url.match(/https:\/\/(.+\.)?bilibili.com\/(video|bangumi)/gi) ) {
                console.log(currentTab.id);
                injectIntoTab(currentTab.id);
            }
        }
    }
});

// 获取弹幕url
function getDmUrl(text, tabid){
    var resp = JSON.parse(text);
    var dmurl = "https://api.bilibili.com/x/v1/dm/list.so?oid=" + resp.data[0].cid.toString();
    console.log("获取到视频页传来的cid" + tabid.toString());
    linkdata[tabid] = dmurl;
    console.log("已保存弹幕链接数据" + tabid.toString() + ": " + dmurl)
    // getDanmaku(dmurl, tabid);
    fetch(dmurl).then(response => response.text()).then(text => parseXml(text, tabid)).catch(error => {console.log(error);})
}

// 接收main.js从网页发来的请求
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    sendResponse({status: "ok"});
    var data = request.data;
    var tabid = request.tabid;
    if (data.cid == undefined){
        // 并未传来cid
        var url = "https://api.bilibili.com/x/player/pagelist?bvid="+data.bid+"&jsonp=jsonp";
        fetch(url).then(response => response.text())
                  .then(text => getDmUrl(text, tabid))
                  .catch(error => {console.log(error);})
    }else{
        var dmurl = "https://api.bilibili.com/x/v1/dm/list.so?oid=" + data.cid.toString();
        console.log("获取到视频页传来的cid" + data.cid.toString());
        // getDanmaku(dmurl, tabid);
        fetch(dmurl).then(response => response.text()).then(text => parseXml(text, tabid)).catch(error => {console.log(error);});
    }
});

// 页面右键菜单
chrome.contextMenus.create({
    id: "getheadimg",
    title: "获取封面图片",
    documentUrlPatterns: ['https://*.bilibili.com/video*', 'https://*.bilibili.com/bangumi*']
});

// 页面右键菜单
chrome.contextMenus.create({
    id: "showcharts",
    title: "展示弹幕地图",
    documentUrlPatterns: ['https://*.bilibili.com/video*', 'https://*.bilibili.com/bangumi*']
});

// 页面右键菜单
chrome.contextMenus.create({
    id: "getavnum",
    title: "地址栏展示av号码链接",
    documentUrlPatterns: ['https://*.bilibili.com/video/BV*']
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
    switch (info.menuItemId){
        case 'getheadimg':
            chrome.tabs.sendMessage(tab.id, {"act": "getimg"}, 
                                    function(response) {
                                        console.log("获取到图片地址, 开始下载: " + response.imgurl);
                                        if (response.imgurl != undefined)
                                            chrome.downloads.download({url: response.imgurl});
                                    });
            break;
        case "showcharts":
            getCurrentTabId(tabid => {
                var dmurl = linkdata[tabid];
                if (dmurl === undefined){
                    console.log("连接数据不存在, 即将注入js到视频页面.");
                    chrome.tabs.sendMessage(tabid,
                                            {"act": "getcid", "tabid": tabid}, 
                                            function(response) {});
                }else{
                    console.log("读取链接成功" + tabid.toString())
                    getDanmaku(dmurl, tabid);
                }
            });
            break;
        case "getavnum":
            chrome.tabs.sendMessage(tab.id, {"act": "copyav"}, function(response) {});
            break;
    }
});

// 当用户接收关键字建议时触发
chrome.omnibox.onInputEntered.addListener((text) => {
    var reg = /\d+/;
    console.log("[" + new Date() + "] omnibox event: 已输入: " + text);
    if(!text) return;
    if(reg.test(text)) {
        let burl = `https://www.bilibili.com/av${text}`;
        openUrlCurrentTab(burl);
    }
});

// 获取当前选项卡ID
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

function parseXml(xmlbody, tabid){
    chrome.tabs.sendMessage(tabid, 
                            {"act": "drawchart", "xmlbody": xmlbody, "filterdata": filterdata}, 
                            function(response) {console.log("发送图表数据到页面")});
}

// ajax获取弹幕
function getDanmaku(url, tabid){
    fetch(url).then(response => response.text()).then(text => parseXml(text, tabid)).catch(error => {console.log(error);});
    return true;
}
