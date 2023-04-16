
function execVedioEventActor() {
    var script = document.createElement('script');
    script.setAttribute("type", "text/javascript");
    script.src = chrome.runtime.getURL("page/pagevideoaction.js");
    (document.head||document.documentElement).appendChild(script);
    script.remove();  // 执行一次就删除
};

execVedioEventActor();