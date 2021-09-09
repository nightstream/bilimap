var editorExtensionId = "afjdebicndobopniobhpjhoaohpihfhm";
var keylist = [];
var bvregx = /\/video\/BV\w+/;
var currentTabId = 0;

document.addEventListener('gotBilid', function(e) {
    console.log("正在发送cid到background.js");
    chrome.runtime.sendMessage({"act": "transcid", "data": e.detail, "tabid": currentTabId}, function(response) {
        console.log("已发送cid到background.js");
    });
});

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    currentTabId = request.tabid;
    var act = request.act;
    var resp = {status: "ok"};
    if (act === "getimg"){
        var metalist = document.getElementsByTagName("meta");
        for (var i = 0; i < metalist.length; i ++){
            var item = metalist[i];
            var name = item.attributes['itemprop'] || item.attributes["property"];
            console.log(item);
            if (name === undefined)
                continue
            if (name.value == "image" || name.value == "og:image"){
                var addr = item.attributes["content"].value;
                resp.imgurl = addr;
                break;
            }
        }
    }else if (act === "drawchart") {
        var data = getDanmakuList(request.xmlbody, request.filterdata);
        var parent = document.getElementById("playerWrap") || document.getElementById("review_module");
        var oldchart = parent.children.danmakuMap;
        var chartdiv = document.createElement("div");
        chartdiv.id = "danmakuMap";
        chartdiv.style = "width: 100%; height: 200px;"
        if (oldchart != undefined && oldchart != null)
            parent.removeChild(oldchart);
        parent.appendChild(chartdiv)
        drawChart(data);
    }else if (act === "getcid"){
        // 注入js脚本
        injectedFunction();
    }else if(act == "copyav"){
        var url = window.location.href;
        if (!bvregx.test(url))
            return;
        var bvlist = bvregx.exec(url);
        if (bvlist.length < 1)
            return;
        console.log(bvlist);
        var bili = new BiliABV();
        var avnum = bili.bv2av(bvlist[0].substr(7));
        window.history.pushState({}, 0, "https://www.bilibili.com/video/"+avnum);
    }
    sendResponse(resp);
});

function injectedFunction() {
    var script = document.createElement('script');
    script.setAttribute("type", "text/javascript");
    script.src = chrome.runtime.getURL("page/pagevideoinfo.js");
    (document.head||document.documentElement).appendChild(script);
    script.remove();  // 执行一次就删除
}

// 解析弹幕xml
function getDanmakuList(xmlstring, filterdata){
    // var regx = /\<d\s+p\=\"([\w\,\.]+)\"\>(.+)\<\/d\>/g;
    var domParser = new DOMParser();
    var xmldata = domParser.parseFromString(xmlstring, 'text/xml');
    var dmlist = xmldata.documentElement.getElementsByTagName("d");
    var ydata = {};
    var max_x = 0;  // 记录最终弹幕时间
    // regx.compile(regx);
    Object.keys(filterdata).forEach(function(key){
        filterdata[key] = new RegExp(filterdata[key], "gi");
    });
    for (var i = 0; i < dmlist.length; i ++){
        var item = dmlist[i];
        var dmstr = item.textContent;  // 弹幕内容
        var param = item.attributes['p'].value.split(",");
        var pgtime = parseFloat(param[0]);  // 进度条时间
        var dateobj = new Date(parseInt(param[4]) * 1000);  // 弹幕发送时间

        if (pgtime > max_x)
            max_x = pgtime;

        var keydata = checkFilter(dmstr, filterdata);  // 检测通过的keyname
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

function checkFilter(dmstr, filterdata){
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