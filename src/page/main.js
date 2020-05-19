var editorExtensionId = "afjdebicndobopniobhpjhoaohpihfhm";
var keylist = [];

document.addEventListener('gotBilid', function(e) {
    console.log("正在发送cid到background.js");
    chrome.runtime.sendMessage({"act": "transcid", "data": e.detail}, function(response) {
        console.log("已发送cid到background.js");
    });
    return;
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
        var cid = window.__INITIAL_STATE__.epInfo && window.__INITIAL_STATE__.epInfo.cid;
        var tabid = ${ request.tabid };
        var evt = new CustomEvent("gotBilid", {detail: {bid: bvid, cid: cid, tabid: tabid}});
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

function drawChart(data){
    var xdata = [];
    var option = {
        dataZoom: [
            {
                id: 'dataZoomX',
                type: 'inside',
                xAxisIndex: [0],
                filterMode: 'filter'
            }
        ],
        xAxis: {
            name: "时间(秒)",
            type: 'category',
            data: [], // ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        },
        yAxis: {
            name: "弹幕数量",
            type: 'value'
        },
        tooltip: {
            trigger: 'axis',
            formatter: function (params) {
                var res = "";
                var xvalue = parseInt(params[0].name);
                var minutes = Math.floor(xvalue / 60);
                var seconds = xvalue % 60;
                if (minutes > 0)
                    res = minutes.toString() + "分";
                res += seconds.toString() + "秒"
                for (var i = 0; i < params.length; i ++){
                    var item = params[i];
                    if (parseInt(item.value) > 0)
                        res += "<br />" + item.seriesName + ": " + item.value;
                }
                return res;
            },
            axisPointer: {
                animation: false
            }
        },
        legend: {
            data: [],  // ['key1', "key2"]
        },
        series: []  // [{type: 'line', name: "名称", data: [数据项]]}, ...]
    };
    Object.keys(data.ydata).forEach(function(key){
        // 遍历对象
        var seriesitem = {type: 'line', name: key, data: []};
        var keydata = data.ydata[key];

        for (var i = 0; i <= data.xdata + 1; i ++){
            var num = keydata[i] === undefined ? 0 : keydata[i];
            seriesitem.data.push(num);
        }

        option.legend.data.push(key);
        option.series.push(seriesitem);
    });
    for (var i = 0; i <= data.xdata + 1; i ++)
        option.xAxis.data.push(i);

    var datachart = echarts.init(document.getElementById('danmakuMap'));
    datachart.setOption(option);
}