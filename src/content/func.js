/**
一些功能性的函数
*/

function drawChart(data){
    let option = {
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
                let res = "";
                let xvalue = parseInt(params[0].name);
                let minutes = Math.floor(xvalue / 60);
                let seconds = xvalue % 60;
                if (minutes > 0)
                    res = minutes.toString() + "分";
                res += seconds.toString() + "秒"
                for (let i = 0; i < params.length; i ++){
                    let item = params[i];
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
        let seriesitem = {type: 'line', name: key, data: []};
        let keydata = data.ydata[key];

        for (let i = 0; i <= data.xdata + 1; i ++){
            let num = keydata[i] === undefined ? 0 : keydata[i];
            seriesitem.data.push(num);
        }

        option.legend.data.push(key);
        option.series.push(seriesitem);
    });
    for (let i = 0; i <= data.xdata + 1; i ++)
        option.xAxis.data.push(i);

    let datachart = echarts.init(document.getElementById('danmakuMap'));
    datachart.setOption(option);
    datachart.getZr().on('click',function(params){
        if (params.offsetY < 20)
            return;
        let point=[params.offsetX,params.offsetY];
        let idx = datachart.convertFromPixel({seriesIndex:0}, point)[0];
        let evt = new CustomEvent("vjump", {detail: idx});
        // 触发事件，传递视频的cid码
        document.dispatchEvent( evt );
        // let obj = getVideoObj();
        // mediaJump(obj, idx);
    });
}

function BiliABV(){
    this.BVSTR = 'fZodR9XQDSUm21yCkr6zBqiveYah8bt4xsWpHnJE7jL5VG3guMTKNPAwcF';
    this.BVIDX = [11, 10, 3, 8, 4, 6, 2, 9, 5, 7];
    this.BVXOR = new BigNumber(20, 1);
    this.BVADD = new BigNumber(20, 1);
    this.BVCAST = new BigNumber(20, 1);
    this.BVADD.from_decimal("100618342136696320");
    this.BVXOR.from_decimal("177451812");
    this.BVCAST.from_decimal("58");
    this.BVDATA = {};
    for (var i = 0; i < this.BVSTR.length; i ++){
        this.BVDATA[this.BVSTR[i]] = i;
    }
}

BiliABV.prototype.bv2av = function(bvstr){
    let num = new BigNumber(20, 1);
    if (!bvstr.startsWith('BV'))
        bvstr = 'BV' + bvstr;
    for (let i = 0; i < 10; i ++){
        let index = new BigNumber(20, 1);
        let times = new BigNumber(20, 1);
        index.from_decimal(this.BVDATA[bvstr[this.BVIDX[i]]].toString())
        times.from_decimal(i.toString());
        num = num.add(this.BVCAST.pow(times).multiplicate(index));
    }
    return 'av' + num.subtract(this.BVADD).xor(this.BVXOR).to_number();
};

BiliABV.prototype.av2bv = function(avstr){
    let bvstr = 'BV          '.split("");
    let avnum = new BigNumber(20, 1);
    if (avstr.toLowerCase().startsWith("av"))
        avstr = avstr.substr(2);
    avnum.from_decimal(avstr);
    avnum = avnum.xor(this.BVXOR).add(this.BVADD);
    for (let i = 0; i < 10; i ++){
        let index = new BigNumber(20, 1);
        index.from_decimal(i.toString())
        let i_char = avnum.divide(this.BVCAST.pow(index)).mod(this.BVCAST).to_number();
        bvstr[this.BVIDX[i]] = this.BVSTR[i_char];
    }
    return bvstr.join("");
};

function injectedFunction() {
    let script = document.createElement('script');
    script.setAttribute("type", "text/javascript");
    script.src = chrome.runtime.getURL("page/pagevideoinfo.js");
    (document.head||document.documentElement).appendChild(script);
    script.remove();  // 执行一次就删除
}

function parseXml(xmlbody){
    // 解析弹幕数据, 需要popup页面中设置的过滤信息
    chrome.runtime.sendMessage({"act": "getpopconf"})
          .then(resp => {
            console.log("接到弹幕过滤设置, 开始作图...");
            let data = getDanmakuList(xmlbody, resp.data);
            let comment = document.getElementById("comment-module") || document.getElementById("comment");
            let oldchart = document.getElementById("danmakuMap");
            if (oldchart != undefined && oldchart != null)
                oldchart.parentElement.removeChild(oldchart);

            let chartdiv = document.createElement("div");
            chartdiv.id = "danmakuMap";
            chartdiv.style = "width: 100%; height: 200px;"
            comment.parentElement.insertBefore(chartdiv, comment);
            drawChart(data);
          })
          .catch(err => {console.log("获取弹幕过滤信息失败: ", err.toString());});
    
}

// 获取弹幕url
function getDmUrl(text){
    let resp = JSON.parse(text);
    let dmurl = "https://api.bilibili.com/x/v1/dm/list.so?oid=" + resp.data[0].cid.toString();
    console.log("根据bid查询到视频页面使用的cid: " + resp.data[0].cid.toString());
    fetch(dmurl).then(response => response.text())
                .then(text => parseXml(text))
                .catch(error => {console.log(error);})
}

// 解析弹幕xml
function getDanmakuList(xmlstring, filterdata){
    // let regx = /\<d\s+p\=\"([\w\,\.]+)\"\>(.+)\<\/d\>/g;
    let domParser = new DOMParser();
    let xmldata = domParser.parseFromString(xmlstring, 'text/xml');
    let dmlist = xmldata.documentElement.getElementsByTagName("d");
    let ydata = {};
    let max_x = 0;  // 记录最终弹幕时间
    // regx.compile(regx);
    Object.keys(filterdata).forEach(function(key){
        filterdata[key] = new RegExp(filterdata[key], "gi");
    });
    for (let i = 0; i < dmlist.length; i ++){
        let item = dmlist[i];
        let dmstr = item.textContent;  // 弹幕内容
        let param = item.attributes['p'].value.split(",");
        let pgtime = parseFloat(param[0]);  // 进度条时间
        let dateobj = new Date(parseInt(param[4]) * 1000);  // 弹幕发送时间

        if (pgtime > max_x)
            max_x = pgtime;

        let keydata = checkFilter(dmstr, filterdata);  // 检测通过的keyname
        Object.keys(keydata).forEach(function(key){
            ydata[key] = ydata[key] == undefined ? {} : ydata[key];
            for (let i = Math.floor(pgtime); i < Math.floor(pgtime) + 6; i ++){
                ydata[key][i] = ydata[key][i] === undefined ? 0 : ydata[key][i];
                ydata[key][i] += keydata[key];
            }
        });
    };
    return {"xdata": max_x, "ydata": ydata};
}

function checkFilter(dmstr, filterdata){
    // 检测弹幕符合哪些条件
    let keydata = {};
    Object.keys(filterdata).forEach(function(key){
        let num = dmstr.match(filterdata[key]);
        if (num != null && num != undefined) {
            keydata[key] = num.length;
        }
    });
    return keydata;
}

undefined;  // https://www.coder.work/article/1866181 该值将返回到“executing.then”第一个回调参数的结果 
