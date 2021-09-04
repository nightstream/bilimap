/**
一些功能性的函数
*/

// 页面全局变量，记录循环参数
var loopdata = {};

function getVideoObj(){
    // 查找并返回obj元素下的所有媒体标签 video audio embed object 包含iframe中的元素
    var div = document.getElementById("bilibiliPlayer") || document.getElementById("bilibili-player");
    if (!div)
        return;
    var video = div.getElementsByTagName("video");
    if (video.length > 0)
        return video[0];
}

function mediaJump(obj, timestamp){
    // 把obj媒体跳转到指定时间
    if (timestamp < 0 || timestamp > obj.duration)
        return;
    obj.pause();
    console.log("jumptime:" + obj.currentTime);
    obj.currentTime = timestamp;
    obj.play();
}

function go2origin(e){
    console.log("事件触发");
    var obj = e.target;
    var uuid = obj.getAttribute("data-loopuid");
    if (uuid == undefined)
        return;
    if (obj.currentTime < loopdata[uuid]["timeend"])
        return;
    mediaJump(obj, loopdata[uuid]["timestart"]);
}

function bindMediaEvent(obj){
    // 绑定媒体事件
    // 当前时间超过设置时
    var uuid = obj.getAttribute("data-loopuid");
    if (uuid == undefined)
        return;
    if (loopdata[uuid]["timestart"] < 0)  // 定义起点
        loopdata[uuid]["timestart"] = obj.currentTime;
    else{
        loopdata[uuid]["timeend"] = obj.currentTime;
        mediaJump(obj, loopdata[uuid]["timestart"]);
        obj.removeEventListener("timeupdate", go2origin);
        if (loopdata[uuid]["timeend"] < loopdata[uuid]["timestart"]){
            loopdata[uuid]["timeend"] = -1;
            loopdata[uuid]["timestart"] = -1;
            return;
        }
        console.log("endtime:" + loopdata[uuid]["timeend"]);
        obj.addEventListener("timeupdate", go2origin, false);
    }
}

function mediaLoop(obj, timestart, timeend){
    // 循环, 跳转到开头播放
    // 1.判断时间
    // 2.settimeout
    if (obj.currentTime > timeend){
        // 降低延时风险
        console.log("late:" + obj.currentTime);
        mediaJump(obj, timestart);
    }else if (obj.currentTime < timeend - 0.250){
        // 提高超时精度
        var lefttime = (timeend - obj.currentTime) * 1000;
        setTimeout(function(){mediaJump(obj, timestart);}, lefttime)
        console.log("left:" + lefttime);
    }
}

function genUuid(len, radix) {
    var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
    var uuid = [], i;
    radix = radix || chars.length;

    if (len) {
        // Compact form
        for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random()*radix];
    } else {
        // rfc4122, version 4 form
        var r;

        // rfc4122 requires these characters
        uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
        uuid[14] = '4';

        // Fill in random data.  At i==19 set the high bits of clock sequence as
        // per rfc4122, sec. 4.1.5
        for (i = 0; i < 36; i++) {
            if (!uuid[i]) {
                r = 0 | Math.random()*16;
                uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
            }
        }
    }

    return uuid.join('');
}

function isin(e, arr){
    for(var i = 0; i < arr.length; i ++)
        if (arr[i] == e)
            return true;
    return false;
}

function regKeyEvent(event){
    // 策略：
    // 发生按键时，判断按键正确
    // 检测到Z键时，如果video对象没有uuid属性，添加uuid属性，记录当前进度
    //             如果video对象已有uuid属性，控制视频回到起点，清除并重新注册timeupdate事件
    // timeupdate事件：检测事件发生时的进度，当进度超过限制时，跳回起点
    if (!(event.ctrlKey && event.altKey && event.shiftKey)){
        // 如果没有同时按下ctrl alt shift，直接返回
        return;
    }
    var keycode = event.code;
    // 如果按键不是Z键或C键
    if (!isin(keycode, ["KeyZ", "KeyX"]))
        return;
    var video_obj = getVideoObj();
    // 如果没获取到播放器
    if (! video_obj)
        return

    var uuid = video_obj.getAttribute("data-loopuid");
    if (keycode == "KeyX"){
        // clear
        video_obj.removeEventListener("timeupdate", go2origin);
        if (uuid){
            loopdata[uuid]["timeend"] = -1;
            loopdata[uuid]["timestart"] = -1;
            loopdata[uuid]["interval"] = -1;
        }
        video_obj.removeEventListener("timeupdate", go2origin);
        return;
    }

    if (video_obj.paused)
        return;
    if (uuid == undefined){
        uuid = genUuid();
        video_obj.setAttribute("data-loopuid", uuid);
        loopdata[uuid] = {"timestart": -1, "timeend": -1, "interval": -1}
    }
    if (keycode == "KeyZ"){
        bindMediaEvent(video_obj);
    }
}

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
    datachart.getZr().on('click',function(params){
        if (params.offsetY < 20)
            return;
        let point=[params.offsetX,params.offsetY];
        let idx = datachart.convertFromPixel({seriesIndex:0}, point)[0];
        let obj = getVideoObj();
        mediaJump(obj, idx);
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
    var num = new BigNumber(20, 1);
    if (!bvstr.startsWith('BV'))
        bvstr = 'BV' + bvstr;
    for (var i = 0; i < 10; i ++){
        var index = new BigNumber(20, 1);
        var times = new BigNumber(20, 1);
        index.from_decimal(this.BVDATA[bvstr[this.BVIDX[i]]].toString())
        times.from_decimal(i.toString());
        num = num.add(this.BVCAST.pow(times).multiplicate(index));
    }
    return 'av' + num.subtract(this.BVADD).xor(this.BVXOR).to_number();
}

BiliABV.prototype.av2bv = function(avstr){
    var bvstr = 'BV          '.split("");
    var avnum = new BigNumber(20, 1);
    if (avstr.toLowerCase().startsWith("av"))
        avstr = avstr.substr(2);
    avnum.from_decimal(avstr);
    avnum = avnum.xor(this.BVXOR).add(this.BVADD);
    for (var i = 0; i < 10; i ++){
        var index = new BigNumber(20, 1);
        index.from_decimal(i.toString())
        var i_char = avnum.divide(this.BVCAST.pow(index)).mod(this.BVCAST).to_number();
        bvstr[this.BVIDX[i]] = this.BVSTR[i_char];
    }
    return bvstr.join("");
}