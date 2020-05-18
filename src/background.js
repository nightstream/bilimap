// 读取本地弹幕规则 
filterdata = {};
linkdata = {};
chrome.storage.sync.get({"keylist": []}, function(result) {
    updateFilter(result.keylist);
});

chrome.manifest = chrome.app.getDetails();

function injectIntoTab(tabid) {
    var scripts = chrome.manifest.content_scripts[0].js;
    for(var i = 0 ; i < scripts.length; i++ ) {
        chrome.tabs.executeScript(tabid, {
            file: scripts[i]
        });
    }
}

// Get all windows
chrome.windows.getAll({
    populate: true
}, function (windows) {
    var i = 0, w = windows.length, currentWindow;
    for( ; i < w; i++ ) {
        currentWindow = windows[i];
        var j = 0, t = currentWindow.tabs.length, currentTab;
        for( ; j < t; j++ ) {
            currentTab = currentWindow.tabs[j];
            if( currentTab.url.match(/https:\/\/(.+\.)?bilibili.com\/(video|bangumi)/gi) ) {
                console.log(currentTab);
                injectIntoTab(currentTab.id);
            }
        }
    }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    sendResponse({status: "ok"});
    var data = request.data;
    var dmurl = "https://api.bilibili.com/x/v1/dm/list.so?oid=" + data.cid.toString();
    var tabid = data.tabid;
    console.log("获取到视频页传来的cid" + tabid.toString());
    linkdata[tabid] = dmurl;
    console.log("已保存弹幕链接数据" + tabid.toString() + ": " + dmurl)
    getDanmaku(dmurl, tabid);
});

// 页面右键菜单
chrome.contextMenus.create({
    title: "获取封面图片",
    onclick: function(param){
        getCurrentTabId(tabid => {
            chrome.tabs.sendMessage(tabid,
                                    {"act": "getimg"}, 
                                    function(response) {
                                        console.log("获取到图片地址, 开始下载: " + response.imgurl);
                                        if (response.imgurl != undefined)
                                            chrome.downloads.download({url: response.imgurl});
                                    });
        });
    },
    documentUrlPatterns: ['https://*.bilibili.com/video*', 'https://*.bilibili.com/bangumi*']
});

// 页面右键菜单
chrome.contextMenus.create({
    title: "展示弹幕地图",
    onclick: function(){
        getCurrentTabId(tabid => {
            var dmurl = linkdata[tabid];
            if (dmurl === undefined){
                console.log("连接数据不存在，即将注入js到视频页面.");
                chrome.tabs.sendMessage(tabid,
                                        {"act": "getcid", "tabid": tabid}, 
                                        function(response) {});
            }else{
                console.log("读取链接成功" + tabid.toString())
                getDanmaku(dmurl, tabid);
            }
        });
    },
    documentUrlPatterns: ['https://*.bilibili.com/video*', 'https://*.bilibili.com/bangumi*']
});

// 地址栏
chrome.omnibox.onInputChanged.addListener((text, suggest) => {
    var reg = /\d+/;
    if(!text) return;
    if(reg.test(text)) {
        suggest([
            {content: '去往->https://www.bilibili.com/av' + text, description: 'https://www.bilibili.com/av' + text}
        ]);
    }
});

// 当用户接收关键字建议时触发
chrome.omnibox.onInputEntered.addListener((text) => {
    if(!text) return;
    var href = '';
    if(text.startsWith('去往->')) href = text.replace('去往->', '');
    openUrlCurrentTab(href);
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

// 监听并过滤网络请求
chrome.webRequest.onCompleted.addListener(function (details) {
    // https://api.bilibili.com/x/v1/dm/list.so?oid=128038821
    var regx = /\/v\d+\/dm\/(list\.so|history)\?/;  // 弹幕请求地址
    if(regx.test(details.url)) {
        linkdata[details.tabId] = details.url;
    }
}, {urls: ['https://*.bilibili.com/*', 'http://*.bilibili.com/*']});

// ajax获取弹幕
function getDanmaku(url, tabid){
    var xmlhttp=new XMLHttpRequest();
    xmlhttp.onreadystatechange=function(){
        if (xmlhttp.readyState==4 && xmlhttp.status==200){ // 200 = "OK"
            var dmdata = getDanmakuList(xmlhttp.responseXML);
            chrome.tabs.sendMessage(tabid, 
                                    {"act": "drawchart", "chartdata": dmdata}, 
                                    function(response) {console.log("发送图表数据到页面")});
        }
    };
    xmlhttp.open("GET", url, true);
    xmlhttp.send(null);
}

// 解析弹幕xml
function getDanmakuList(xmldata){
    // var regx = /\<d\s+p\=\"([\w\,\.]+)\"\>(.+)\<\/d\>/g;
    var dmlist = xmldata.documentElement.getElementsByTagName("d");
    var ydata = {};
    var max_x = 0;  // 记录最终弹幕时间
    // regx.compile(regx);
    for (var i = 0; i < dmlist.length; i ++){
        var item = dmlist[i];
        var dmstr = item.textContent;  // 弹幕内容
        var param = item.attributes['p'].value.split(",");
        var pgtime = parseFloat(param[0]);  // 进度条时间
        var dateobj = new Date(parseInt(param[4]) * 1000);  // 弹幕发送时间

        if (pgtime > max_x)
            max_x = pgtime;

        var keydata = checkFilter(dmstr, pgtime);  // 检测通过的keyname
        Object.keys(keydata).forEach(function(key){
            ydata[key] = ydata[key] == undefined ? {} : ydata[key];
            for (var i = Math.floor(pgtime); i < Math.floor(pgtime) + 6; i ++){
                ydata[key][i] = ydata[key][i] === undefined ? 0 : ydata[key][i];
                ydata[key][i] += keydata[key];
            }
        });
    };
    return {"xdata": max_x, "ydata": ydata};
}

function checkFilter(dmstr){
    // 检测弹幕符合哪些条件
    var keydata = {};
    Object.keys(filterdata).forEach(function(key){
        var num = dmstr.match(filterdata[key]);
        if (num != null && num != undefined) {
            keydata[key] = num.length;
        }
    });
    return keydata;
}

// 更新弹幕规则
function updateFilter(filterlist){
    filterdata = {};
    filterlist.forEach(function (item){
        var name = item[0];
        var regx = item[1];
        var checked = item[2];
        if (checked == 1)
            filterdata[name] = new RegExp(regx, "gi")
    });
    console.log("全局变量filterdata已更新");
}
