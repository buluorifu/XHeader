# XHeader

一个本地优先的 Chrome 请求头管理扩展，适合接口联调、前端开发和经过授权的安全测试。

XHeader 可以按配置文件管理请求头规则，并按照域名或 URL 范围自动应用。项目不依赖远程脚本、不需要登录，也不会把配置上传到第三方服务。

## 功能特性

- 多个工作环境配置
- 按域名、路径或完整 URL 匹配
- 请求头覆盖、追加和删除
- 全局启用/暂停
- 当前配置单独启用/暂停
- JSON 配置导入和导出
- 配置本地自动保存
- 请求头规则独立滚动区域
- 固定尺寸双栏界面，切换配置时布局稳定
- Chrome Manifest V3
- 工具栏和扩展管理页图标

默认配置为 `XFF测试`，匹配范围为 `*`，预置常见代理来源 IP 请求头，值为 `127.0.0.1`。

## 安装方式

1. 下载或克隆本项目。
2. 打开 Chrome：`chrome://extensions`。
3. 开启右上角的“开发者模式”。
4. 点击“加载已解压的扩展程序”。
5. 选择本项目根目录。
6. 点击浏览器工具栏中的 XHeader 图标。

代码更新后，在 `chrome://extensions` 页面点击 XHeader 的“重新加载”即可生效。

## 基本使用

### 创建配置

在左侧“工作环境”栏点击 `＋` 新建配置，然后填写：

- 配置名称：例如 `测试环境`、`开发环境`。
- 匹配范围：例如 `example.com`、`localhost` 或 `*`。
- 请求头名称和值：例如 `X-Debug-Mode: true`。

多个匹配范围可以使用逗号分隔：

```text
example.com, api.example.com, localhost
```

### 请求头操作

- `覆盖`：设置请求头的新值；请求中已有同名 Header 时会替换。
- `追加`：在请求中追加指定值。
- `删除`：删除指定请求头，不需要填写值。

所有配置修改会自动保存，并同步到 Chrome 的规则引擎。

## XFF 测试配置

默认配置包含以下常见请求头：

```text
X-Forwarded-For: 127.0.0.1
X-Real-IP: 127.0.0.1
X-Client-IP: 127.0.0.1
Client-IP: 127.0.0.1
True-Client-IP: 127.0.0.1
CF-Connecting-IP: 127.0.0.1
X-Cluster-Client-IP: 127.0.0.1
X-Original-Forwarded-For: 127.0.0.1
Forwarded: 127.0.0.1
X-Forwarded: 127.0.0.1
Forwarded-For: 127.0.0.1
X-Forwarded-For-Original: 127.0.0.1
X-Original-Client-IP: 127.0.0.1
X-Original-Remote-Addr: 127.0.0.1
X-Remote-IP: 127.0.0.1
X-Remote-Addr: 127.0.0.1
X-ProxyUser-Ip: 127.0.0.1
WL-Proxy-Client-IP: 127.0.0.1
Proxy-Client-IP: 127.0.0.1
Fastly-Client-IP: 127.0.0.1
```

不同服务对代理来源 Header 的识别方式不同，请根据目标服务的实际实现选择和调整字段。仅应在你拥有权限的系统和测试环境中使用。

## 安全与隐私

- 配置只保存在 Chrome 的 `chrome.storage.local` 中。
- 请求头由 Chrome `declarativeNetRequest` 规则引擎处理。
- 没有远程 JavaScript、远程配置、埋点或第三方分析服务。
- 没有页面脚本注入，不读取网页正文或表单内容。
- 项目没有登录、账号体系或外部 API。

### 权限说明

项目声明了以下权限：

- `storage`：保存本地配置。
- `declarativeNetRequestWithHostAccess`：应用请求头修改规则。
- `<all_urls>`：允许用户将规则应用到自己配置的任意网站。

由于 `<all_urls>` 具有较大的主机访问范围，建议只从可信来源安装，并在不需要时关闭全局规则或暂停扩展。

## 项目结构

```text
XHeader/
├── manifest.json       # Chrome 扩展清单
├── background.js       # 动态请求头规则同步
├── popup.html          # 弹窗结构
├── popup.css           # 弹窗样式
├── popup.js            # 配置编辑与交互逻辑
├── icons/              # 扩展图标资源
├── README.md           # 项目说明
├── PRODUCT.md          # 产品定位
└── DESIGN.md           # 界面设计说明
```

## 当前限制

当前版本主要处理请求头，暂不支持：

- 响应头修改
- 按标签页临时启用
- 规则分组和批量编辑
- 在线同步配置
- 自动生成发布压缩包

## 开发说明

项目使用原生 HTML、CSS 和 JavaScript，没有构建步骤，也没有第三方运行时依赖。修改代码后直接在 Chrome 扩展管理页重新加载即可。

提交前建议检查：

```powershell
node --check popup.js
node --check background.js
```

## 免责声明

本项目仅用于开发调试、接口联调和经过授权的安全测试。使用者应确保对目标网站、接口或系统拥有明确的测试授权，并自行承担使用本工具产生的责任。
