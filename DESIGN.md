# XHeader Design System

## Direction

清晨霜雪映出的蓝色工作台：纯白内容面承载清晰的规则编辑，冷蓝只用于当前选择、主要动作和运行状态。整体保持克制、轻量和可扫描。

## Color

所有颜色使用 OKLCH。

- Background: `oklch(0.985 0.004 256)`
- Surface: `oklch(1 0 0)`
- Secondary surface: `oklch(0.965 0.008 256)`
- Ink: `oklch(0.245 0.025 256)`
- Muted ink: `oklch(0.58 0.018 256)`
- Primary: `oklch(0.49 0.16 256)`
- Success: `oklch(0.57 0.14 157)`
- Danger: `oklch(0.55 0.17 25)`

## Typography

使用系统无衬线字体栈，强调阅读速度和跨平台一致性。标题 16–17px、正文 13px、辅助信息 10–11px，标签使用 12px 中等字重。

## Components

- Topbar: 品牌、导入导出和全局启停。
- Brand mark: 蓝色方形底、白色 X 和三条请求头线，作为工具栏与扩展管理页图标。
- Workspace shell: 顶部工具栏下的两列工作区，左侧固定环境栏，右侧规则编辑器。
- Profile sidebar: 纵向可滚动的配置文件选择器，始终保持可见，避免长页面切换环境。
- Rule editor: 配置名称、匹配范围和请求头表单。
- Header row: 名称、值、覆盖/追加/删除操作和移除按钮。
- Footer status: 规则准备状态、规则数量和 Manifest 版本。
- Status badges: 运行状态与保存状态使用紧凑胶囊徽标，成功、暂停和错误保持语义区分。

## Interaction

配置编辑使用轻微的 150ms 状态过渡。顶部工具栏保持紧凑，规则行使用轻量分隔线，当前环境通过蓝色选中条和浅蓝背景识别。保存状态显示“保存中…”和“已保存”，输入错误以边框和明确文字反馈。支持 `prefers-reduced-motion`。
