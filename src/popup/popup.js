// 点击开启popup页面时触发
var keylist = [];
var comfunc = new CompatibleBrowser();

chrome.storage.sync.get({"keylist": []}, function(result) {
    // 从数据库获取数据，渲染到popup列表
    keylist = result.keylist;
    keylist.forEach(function(item){
        addItemToList(item);
    });
});

// 绑定回车键事件
document.getElementById("key").onkeyup = function(e){
    if (e.keyCode === 13){
        // 回车键
        let key = this.value.trim();
        if (key.length > 0)
            document.getElementById("regx").focus();
    }
};

document.getElementById("regx").onkeyup = function(e){
    if (e.keyCode === 13){
        // 回车键
        let regx = this.value;
        let key = document.getElementById("key").value.trim();
        if (key.length > 0 && regx.length > 0){
            updateUList(key, regx);
            this.value = "";
            document.getElementById("key").value = "";
            document.getElementById("key").focus();
        }
    }
};

if (comfunc.getBrowsertype() == "chrome"){
    document.getElementById("switch").onclick = function(e) {
        if (document.getElementById("morehandle").style.width == "0px"){
            document.getElementById("inputbox").style.width = "0px";
            document.getElementById("morehandle").style.width = "100%";
        }else{
            document.getElementById("inputbox").style.width = "100%";
            document.getElementById("morehandle").style.width = "0px";
        }
    };

    document.getElementById("import").onchange = function () {
        if (this.files.length == 0)
            return;
        let file = this.files[0];
        let reader = new FileReader();
        reader.readAsArrayBuffer(file);
        document.getElementById("import").value = "";

        reader.onloadend = function () {
            console.log("加载开始");
            let str = Utf8ArrayToStr(new Uint8Array(this.result));
            let regxlist = str.split("\n");
            console.log(regxlist);
            regxlist.forEach(function(item){
                item = item.trim();
                let kvi = item.indexOf(":");
                if (item.length == 0){
                    console.log("检测到空行, 跳过");
                }else if (kvi < 0){
                    console.log("数据不符合条件, 跳过此行:" + item);
                }else{
                    let key = item.slice(0, kvi).trim();
                    let regxstr = item.slice(kvi+1).trim();
                    updateUList(key, regxstr);
                }
            });
        };
    };

    document.getElementById("export").onclick = function () {
        let blob, bloburl, content, regxstr = "";
        for (let i = 0; i < keylist.length; i ++){
            regxstr += keylist[i][0] + ": " + keylist[i][1] + "\r\n";
        }
        // blob = new Blob([regxstr], {type: 'text/plain;charset=utf-8'});
        blob = new Blob([regxstr], {type: 'dmreg/plain;charset=utf-8'});
        bloburl = URL.createObjectURL(blob);
        chrome.downloads.download({url: bloburl, filename: "弹幕规则配置.dmreg"})
    };
}

function addItemToList(info){
    // value, checked
    // <li><input type="checkbox" class="chkbx" value=""><span>value</span></span></li>
    let regname = info[0];
    let regx = info[1];
    let checked = (info[2] == 1);
    let ul = document.getElementById("keylist");
    let li = document.createElement('li');
    let chkbx = document.createElement("input");
    let linum = document.getElementsByClassName("chkbx").length;
    let span = document.createElement("span");
    let btn = document.createElement("input");
    chkbx.type = "checkbox";
    chkbx.className = "chkbx";
    chkbx.value = regx;
    if (checked)
        chkbx.checked = true;
    chkbx.innerHTML = regname;
    chkbx.onchange = function(e){
        let v = keylist[linum];
        v[2] = 0;
        if (this.checked)
            v[2] = 1;
        keylist[linum] = v;
        chrome.storage.sync.set({"keylist": keylist}, function() {
            console.log("更新完毕");
        });
    };
    span.className = "keyname";
    span.innerHTML = regname;
    span.onclick = function(e){
        document.getElementById("key").value = regname;
        document.getElementById("regx").value = chkbx.value;
    };
    btn.type = "button";
    btn.value = "删除";
    btn.className = "delbtn";
    btn.onclick = function(e){
        let newkeylist = [];
        let e_list = document.getElementsByClassName("chkbx");
        ul.removeChild(li);
        for (let i = 0; i < e_list.length; i ++){
            let e_check = e_list[i];
            let e_span = e_check.parentElement.getElementsByTagName("span")[0];
            let new_item = [e_span.innerHTML, e_check.value, 0];
            if (e_check.checked)
                new_item[2] = 1;
            newkeylist.push(new_item);
        }
        keylist = newkeylist;
        chrome.storage.sync.set({"keylist": newkeylist}, function() {
            console.log("更新完毕");
        });
    };
    li.appendChild(chkbx);
    li.appendChild(span);
    li.appendChild(btn);
    ul.appendChild(li);
}

function updateUList(key, regx){
    // 更新ul列表
    let flag = true;
    for (let i = 0; i < keylist.length; i ++){
        if (keylist[i][0] == key){
            keylist[i][1] = regx;
            flag = false;
            break;
        }
    }
    if(flag){
        keylist.push([key, regx, 0]);
        addItemToList([key, regx, 0]);
    }else{
        let spans = document.getElementsByClassName("keyname");
        for (let i = 0; i < spans.length; i ++){
            let item = spans[i];
            if (item.innerText == key)
                chkbox = item.parentElement.getElementsByClassName('chkbx')[0].value = regx;
        }
    }
    chrome.storage.sync.set({"keylist": keylist}, function() {
        console.log("更新完毕");
    });
}

function Utf8ArrayToStr(array) {
    let char2,char3;

    let out = "";
    let len = array.length;
    let i = 0;
    while(i < len) {
        let c = array[i++];
        switch(c >> 4) {
            case 0: case 1: case 2: case 3: case 4: case 5: case 6: case 7:
                // 0xxxxxxx
                out += String.fromCharCode(c);
                break;
            case 12: case 13:
                // 110x xxxx   10xx xxxx
                char2 = array[i++];
                out += String.fromCharCode(((c & 0x1F) << 6) | (char2 & 0x3F));
                break;
            case 14:
                // 1110 xxxx  10xx xxxx  10xx xxxx
                char2 = array[i++];
                char3 = array[i++];
                out += String.fromCharCode(((c & 0x0F) << 12) |
                    ((char2 & 0x3F) << 6) |
                    ((char3 & 0x3F) << 0));
                break;
        }
    }
    return out;
}

function code2utf8(uni) {
    let uni2 = uni.toString(2);
    if (uni < 128) {
        return uni.toString(16);
    } else if (uni < 2048) {
        uni2 = ('00000000000000000' + uni2).slice(-11);
        const s1 =  parseInt("110" + uni2.substring(0, 5), 2);
        const s2 =  parseInt("10" + uni2.substring(5), 2);
        return s1.toString(16) + ',' + s2.toString(16);
    } else {
        uni2 = ('00000000000000000' + uni2).slice(-16);
        const s1 = parseInt('1110' + uni2.substring(0, 4),2 );
        const s2 = parseInt('10' + uni2.substring(4, 10), 2 );
        const s3 = parseInt('10' + uni2.substring(10), 2);
        return s1.toString(16) + ',' + s2.toString(16) + ',' + s3.toString(16);
    }
}

function strToUtf8Array(str) {
    let val = "";
    for (let i = 0; i < str.length; i++) {
        val += ',' + code2utf8(str.charCodeAt(i));
    }
    val += ',00';
    // 将16进制转化为ArrayBuffer
    return new Uint8Array(val.match(/[\da-f]{2}/gi).map(function (h) {
        return parseInt(h, 16);
    })).buffer;
}
