var editorExtensionId = "afjdebicndobopniobhpjhoaohpihfhm";
var keylist = [];

document.addEventListener('gotBilid', function(e) {
    console.log("正在发送cid到background.js");
    chrome.runtime.sendMessage({"act": "transcid", "data": e.detail}, function(response) {
        console.log("已发送cid到background.js");
    });
});

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log(request);
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
        var data = request.chartdata;
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
        var jscode = `
        var bvid = window.__INITIAL_STATE__.bvid;
        var bcid = window.__INITIAL_STATE__.epInfo && window.__INITIAL_STATE__.epInfo.cid;
        var tabid = ${ request.tabid };
        var evt = new CustomEvent("gotBilid", {detail: {bid: bvid, cid: bcid, tabid: tabid}});
        // 触发事件，传递视频的cid码
        document.dispatchEvent( evt );
        `;

        var script = document.createElement('script');
        script.textContent = jscode;
        (document.head||document.documentElement).appendChild(script);
        script.remove();
    }
    sendResponse(resp);
});

document.onkeyup = function(event){
    regKeyEvent(event);
};