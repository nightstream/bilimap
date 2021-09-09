/**
一些功能性的函数
*/

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