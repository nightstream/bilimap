var editorExtensionId = "afjdebicndobopniobhpjhoaohpihfhm";

document.addEventListener('gotBilid', function(e) {
    // injectedFunction -> 注入pagevideoinfo.js -> 读取页面变量 -> 触发gotBilid事件并传回数据
    if (e.detail.cid == undefined){
        // 并未获得cid
        let url = "https://api.bilibili.com/x/player/pagelist?bvid="+e.detail.bid+"&jsonp=jsonp";
        fetch(url).then(response => response.text())
                    .then(text => getDmUrl(text))
                    .catch(error => {console.log(error);})
    }else{
        let dmurl = "https://api.bilibili.com/x/v1/dm/list.so?oid=" + e.detail.cid.toString();
        console.log("获取到当前页面的cid: " + e.detail.cid.toString());
        fetch(dmurl).then(response => response.text())
                    .then(text => parseXml(text))
                    .catch(error => {console.log(error);});
    }
});

chrome.runtime.onMessage.addListener(
    (request, sender, sendResponse) => {
        currentTabId = request.tabid;
        let act = request.act;
        let resp = {status: "ok"};
        if (act === "getimg"){
            console.log("接到菜单数据, 准备下载封面");
            let metalist = document.getElementsByTagName("meta");
            for (let i = 0; i < metalist.length; i ++){
                let item = metalist[i];
                let name = item.attributes['itemprop'] || item.attributes["property"];
                if (name === undefined)
                    continue
                if (name.value == "image" || name.value == "og:image"){
                    let addr = item.attributes["content"].value.split("@")[0];
                    if (addr.startsWith("//")) {
                        addr = "https:" + addr
                    }
                    resp.imgurl = addr;
                    break;
                }
            }
        }else if (act === "getcid"){
            // 注入js脚本
            console.log("接到脚本消息, 探测页面的id信息");
            injectedFunction();
        }else if(act == "copyav"){
            let url = window.location.href;
            let bvregx = /\/video\/BV\w+/;
            if (!bvregx.test(url))
                return;
            let bvlist = bvregx.exec(url);
            if (bvlist.length < 1)
                return;
            console.log(bvlist);
            let bili = new BiliABV();
            let avnum = bili.bv2av(bvlist[0].substr(7));
            window.history.pushState({}, 0, "https://www.bilibili.com/video/"+avnum);
        }
        sendResponse(resp);
    });
