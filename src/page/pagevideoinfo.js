function detectPageIds(){
    // 检查并探测当前页面内容，找出各类id信息
    if (window.__INITIAL_STATE__ != undefined){
        let bvid = window.__INITIAL_STATE__.bvid;
        let bcid = window.__INITIAL_STATE__.epInfo && window.__INITIAL_STATE__.epInfo.cid;
        if (bcid == undefined ){
            let emap = window.__INITIAL_STATE__.cidMap;
            bcid = emap[bvid].cids[1];
        }
        console.log(`BV页面, 存在__INITIAL_STATE__属性, bvid, bcid: ${bvid} ${bcid}`);
        return {bid: bvid, cid: bcid};
    }
    else if (window.__NEXT_DATA__ != undefined){
        let pathdata = window.location.pathname.split("/");
        let epstr = pathdata[pathdata.length - 1];
        console.log(`未找到__INITIAL_STATE__属性, 当前epid: ${epstr}`);
        if (epstr.startsWith("ss")) {
            // 页面地址的id以ss开头, 说明用户使用seasonid访问页面, 系列全集共享同一个seasonid, 需要判断用户历史
            let epid = window.__NEXT_DATA__.props.pageProps.dehydratedState.queries[1].state.data.userInfo.history.epId;
            if (epid < 0) {
                // 用户从未浏览过此番剧, 取第一个
                epid = window.__NEXT_DATA__.props.pageProps.dehydratedState.queries[0].state.data.initEpList[0].ep_id;
                console.log(`用户首次访问该番剧, 获取全系列 ${epstr} 中的默认视频 ${epid}`);
            } else {
                // 否则取用户浏览记录
                epid = window.__NEXT_DATA__.props.pageProps.dehydratedState.queries[1].state.data.userInfo.history.epId;
                console.log(`获取到用户访问番剧 ${epstr} 的进度记录:  ${epid}`);
            }
            epstr = epid.toString();
        }
        else if (epstr.startsWith("ep")) {
            epstr = epstr.slice(2);
            console.log(`epid正常, 切除字母部分: ${epstr}`);
        }
        else {
            let url = window.location.href;
            console.log(`未知的页面类型: ${url}`);
            return {};
        }
        let vdata = window.__NEXT_DATA__.props.pageProps.dehydratedState.queries[0].state.data.epMap[epstr];

        return {bid: vdata.bvid, cid: vdata.cid};
    }

    console.log("无法探测页面的id数据, 请尝试更新bilimap插件。");
    return {};
}

// 单独事件
function sendBiliInfo(){
    let evt = new CustomEvent("gotBilid", {detail: detectPageIds()});
    // 触发事件，传递视频的cid码
    document.dispatchEvent( evt );
};

sendBiliInfo();