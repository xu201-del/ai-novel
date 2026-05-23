# InkFlow DS Pro

AI 赋能的长篇网文创作平台，基于 Next.js 16 + DeepSeek API 构建。

## 技术栈

- **框架**: Next.js 16 (App Router) + React 19
- **状态管理**: Zustand (persist 本地持久化)
- **样式**: Tailwind CSS + CSS 变量设计系统
- **动画**: Framer Motion
- **AI**: DeepSeek API (deepseek-v3)
- **构建**: Turbopack

## 快速开始

```bash
npm install
npm run dev
```

开发服务器默认运行在 `http://localhost:5174`。

## 项目结构

```
src/
├── app/                    # Next.js App Router 页面
│   └── globals.css         # 全局样式 + 设计 Token
├── components/
│   ├── editor/             # 编辑器核心
│   │   ├── ChapterEditor.tsx      # 章节编辑器（contentEditable）
│   │   ├── InspirationMode.tsx    # 灵感模式（小说创建向导）
│   │   ├── NovelFrameworkView.tsx # 框架视图（篇/章纲预览）
│   │   └── OutlineReview.tsx      # 大纲审查
│   ├── layout/             # 布局组件
│   │   ├── LeftSidebar.tsx       # 左侧栏（项目 + 知识库）
│   │   ├── RightPanel.tsx        # 右侧面板（世界圣经）
│   │   ├── MainContent.tsx       # 中间内容区
│   │   └── TopNav.tsx            # 顶部导航
│   ├── novel/              # 小说组件
│   └── ui/                 # 通用 UI 组件
├── hooks/                  # 自定义 Hooks
├── services/               # AI 服务层
│   ├── api.ts                    # fetchAI / fetchAIStream
│   ├── prompts.ts                # Prompt 模板
│   ├── writing-framework.ts      # 写作框架（成长阶段）
│   ├── framework-prompts.ts      # 框架级 Prompt
│   └── volume-deduce.ts          # 篇级章节推演
├── stores/                 # Zustand 状态管理
│   ├── novel-store.ts            # 小说数据 + 操作
│   └── ui-store.ts              # UI 状态
└── types/                  # TypeScript 类型定义
    ├── index.ts
    └── novel-framework.ts
```

## 核心功能

### 灵感模式
输入灵感文本 → AI 分析流派 → 生成书名/简介/主角/世界观 → 流水线式小说创建

### 篇级大纲
- 宏观叙事弧线设计，每篇约 12 章
- 自定义 + AI 生成两种方式新增篇幅
- 篇末高潮钩子自动衔接

### 章/节推演
- 一键推演：AI 根据篇大纲拆解细粒度章节
- 每章自动生成标题、剧情概要、断崖钩子
- 章数可调（1-100），Loading 骨架动画

### 世界圣经
- 一键从框架唤醒：自动填充角色、世界观、时间线
- 支持手动编辑扩充

### 章节编辑器
- contentEditable 富文本编辑
- AI 生成 / 续写 / 下一章 / 改写选中
- 选中文字悬浮菜单（描述五感 / 风格重写）
- 自动保存，复制全文

### 故事流水线
大纲 → 角色 → 世界观 → 篇章 → 草稿 → 精修，六阶段追踪写作进度。

## API Key 配置

点击顶部导航栏设置图标，填入 DeepSeek API Key 即可启用全部 AI 功能。
