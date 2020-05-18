# bilimap

bilimap是一个chrome插件，实现的主要功能是：利用B站（[bilibili](https://www.bilibili.com/)）良好的弹幕生态系统，在B站视频页面生成弹幕图表，展示符合特定规则的弹幕在某一时刻的数量。


# 说明

bilimap 作为一个浏览器插件，目前只在B站的视频页面有效，不支持直播弹幕。

bilimap只与B站存在网络交互，不会向任何服务器上传用户的个人信息，用户的所有设置全部保存在本地浏览器端。

当您从浏览器删除bilimap时，浏览器将清空您对bilimap的所有设置，即使重新安装bilimap，之前的设置无法找回，您可以在卸载bilimap前导出您的设置。

由于每条弹幕大概会在页面停留6秒时间，并且同一弹幕可能多次匹配同一项规则，所以bilimap生成的图表只能粗略展示视频某时刻的同屏弹幕条数，并非视频实际的总弹幕数量。

**注意**：bilimap会修改B站视频页面的右键菜单，添加新的菜单项（功能入口），并且根据用户的操作，bilimap会修改B站页面的展示内容（添加图表），请明确知晓。


# 安装方式

您可以使用chrome浏览器访问bilimap的chrome[商店页面](https://chrome.google.com/webstore/detail/bilimap/akmhahadmmjoidckjonlcbepkaloihed)点击“添加至chrome”直接安装(__版本略低，有些新功能可能不支持__)

或者下载github库到电脑，开启chrome浏览器的“开发者模式”后，点击“加载已解压的扩展程序”，加载版本库内的src目录(__chrome官方不推荐__)

![开发者模式](https://github.com/nightstream/bilimap/blob/master/doc/%E6%88%AA%E5%9B%BE/dev_mode.png?raw=true)


# 功能介绍

## 功能一. 跳转到bilibili

1. 在浏览器地址栏输入bav后按下tab键

![弹幕图表](https://github.com/nightstream/bilimap/blob/master/doc/%E6%88%AA%E5%9B%BE/bav0.png?raw=true)

2. 输入B站av号（一串纯数字)

![弹幕图表](https://github.com/nightstream/bilimap/blob/master/doc/%E6%88%AA%E5%9B%BE/bav1.png?raw=true)

3. 选择地址栏展示出的视频地址，按回车访问

## 功能二. 获取B站视频封面

1. 从B站视频页面点击鼠标右键，调出右键菜单

2. 点击“bilimap”菜单项的子菜单项“获取封面图片”

3. 在浏览器弹出新tab页上右键另存即可

![弹幕图表](https://github.com/nightstream/bilimap/blob/master/doc/%E6%88%AA%E5%9B%BE/getcover.png?raw=true)

## 功能三. 弹幕图表

弹幕图表功能依赖用户设置的正则表达式。

### 1. 添加弹幕规则

1. 点击浏览器地址栏右侧的bilimap的图标，会弹出一个展示页面

2. 页面上存在两个输入框，按输入框提示的信息输入您设定的规则名和正则表达式。

3. 按下回车后，页面将新增一条记录，同时bilimap会将数据保存到浏览器数据库（本地）。

### 2. 查看和修改弹幕规则

1. 点击浏览器地址栏右侧的bilimap的图标，弹出展示页面

2. 点击已存在的任何规则的规则名，相应的信息会展示在页面下方的输入框

3. 您可以对输入框的内容进行修改后再次按下回车提交

4. 如果您变更了规则的名称，bilimap将认为您新增了一条规则，您可以手动删除原有的规则。

5. **bilimap不支持同名规则**，如果您尝试添加一条同名规则，原有的规则将被覆盖。

### 3. 画出图表

1. 确认bilimap的规则展示页面上存在已勾选的规则

2. 从B站视频页面点击鼠标右键，调出右键菜单

3. 点击“bilimap”菜单项的子菜单项“展示弹幕地图”

4. 当前页面的视频播放器下方会出现弹幕图表

![弹幕图表](https://github.com/nightstream/bilimap/blob/master/doc/%E6%88%AA%E5%9B%BE/bilichart.png?raw=true)

### 4.导入导出弹幕规则

1. 点击浏览器地址栏右侧的bilimap的图标，弹出展示页面

2. 点击展示页面的标题，页面的输入框会切换为导入导出按钮

![popup页面标题](https://github.com/nightstream/bilimap/blob/master/doc/%E6%88%AA%E5%9B%BE/popup_title.png?raw=true)  ![导入功能按钮](https://github.com/nightstream/bilimap/blob/master/doc/%E6%88%AA%E5%9B%BE/import_btn.png?raw=true)

3. 点击导入，可以选择导入txt文件或dmreg文件，格式如下（两者内容格式一致）：

```
高能: (高能|核能|预警|经费|预算|特效|炸裂)
卖萌: (23+|awsl|高萌|卖萌|我死了|阿伟|医疗兵|血包)
搞笑: (23+|hh+|xswl|哈哈+|万恶之源|场面|不愧是|红红火)
恰饭: (恰饭|硬广|广告|猝不及防)
```

__可将以上文本以utf8格式保存为".txt"或".dmreg"文件后进行导入__

__您也可以选择从[doc/danmaku.dmreg](https://github.com/nightstream/bilimap/blob/master/doc/danmaku.dmreg?raw=true)下载dmreg文件，文件可使用记事本查看__

4. 点击导出，bilimap将会把已有的全部启用或未启用的弹幕规则存入dmreg文件并自动从本地下载(此处不连接任何远端服务器)


# 其它

bilimap的开发环境是chrome，其它任何浏览器均未测试。并且，bilimap插件的弹出页面挺不好看的。

bilimap的图标由[logoly](https://logoly.pro/)生成，弹幕数据图表使用[echarts](https://www.echartsjs.com/zh/index.html)生成，在bilimap中集成了**删减版**的echarts.min.js。

> 在此向[bestony](https://github.com/bestony/logoly)和[echarts](https://github.com/apache/incubator-echarts)提出感谢。
