// 单独事件

function sendBiliInfo(){
	let bvid = window.__INITIAL_STATE__.bvid;
    let bcid = window.__INITIAL_STATE__.epInfo && window.__INITIAL_STATE__.epInfo.cid;
    let evt = new CustomEvent("gotBilid", {detail: {bid: bvid, cid: bcid}});
    // 触发事件，传递视频的cid码
    document.dispatchEvent( evt );
};

sendBiliInfo();