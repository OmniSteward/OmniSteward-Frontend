# OmniSteward Frontend

这是 [OmniSteward](https://github.com/OmniSteward/OmniSteward) 项目的前端部分,基于 Vue 3 和 Vuetify 3 构建的现代化 Web 界面。

更多关于 OmniSteward 的信息请访问 [OmniSteward](https://github.com/OmniSteward/OmniSteward) 项目。

## 🔗 重要链接

- 📘 [Vue 3 文档](https://v3.vuejs.org/)
- 📗 [Vuetify 文档](https://vuetifyjs.com/)
- 🏠 [后端项目](https://github.com/OmniSteward/OmniSteward)

## 💿 安装

使用你喜欢的包管理器安装依赖:

| 包管理器                                                      | 命令            |
|---------------------------------------------------------------|----------------|
| [yarn](https://yarnpkg.com/getting-started)                   | `yarn install` |
| [npm](https://docs.npmjs.com/cli/v7/commands/npm-install)     | `npm install`  |
| [pnpm](https://pnpm.io/installation)                          | `pnpm install` |
| [bun](https://bun.sh/#getting-started)                        | `bun install`  |

## ✨ 特性

- 🖼️ **现代化技术栈**: 使用最新的 Vue 3 和 Vuetify 3 构建响应式用户界面
- 🗃️ **状态管理**: 集成 Pinia 进行直观的状态管理
- 🚦 **路由系统**: 使用 Vue Router 实现单页应用导航
- 💻 **TypeScript**: 享受类型安全和更好的开发体验
- ⚡ **Vite**: 闪电般的开发体验和热更新
- 🎤 **语音交互**: 支持语音输入和语音播报
- 🏠 **设备控制**: 智能家居设备的可视化控制界面
- 💬 **对话系统**: 流畅的多轮对话体验

## 💡 使用方法

### 开发环境

启动开发服务器:

```bash
yarn dev
```

服务器将在 [http://localhost:3000](http://localhost:3000) 运行

### 生产环境构建

构建生产版本:

```bash
yarn build
```

## 🔧 配置说明

1. 确保后端服务运行在 `http://localhost:8000`
2. 前端默认运行在 `http://localhost:3000`
3. 启动[OmniSteward](https://github.com/OmniSteward/OmniSteward) 后使用 Chrome/Edge 浏览器访问 `http://localhost:8000` 即可使用

### 外网访问注意事项

由于浏览器安全限制,在 HTTP 环境下使用麦克风需要特殊设置:

1. 在 Chrome/Edge 中访问 `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. 添加你的域名和端口 `http://ip:port` 到Chrome/Edge 设置列表当中
3. 重启浏览器

## 📑 许可证

[MIT License](LICENSE)

Copyright (c) 2024-present [ElliottZheng](https://github.com/ElliottZheng)
