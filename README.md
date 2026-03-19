# 小移办公机器人 ↔ OpenClaw 桥接服务

把小移办公平台的消息桥接到本地 OpenClaw agent。

## 工作原理

```
用户 @机器人 [消息]
       ↓
小移办公平台 (AES加密 + HMAC签名)
       ↓ POST /webhook
  桥接服务 (验签 → 解密)
       ↓ openclaw agent --to <号码> --message "<内容>"
  OpenClaw (完整agent能力: 工具/记忆/多模型)
       ↓
  桥接服务 (AES加密 → 下行API)
       ↓
小移办公平台 → 用户看到回复
```

**不需要配置额外的 AI 后端** — 直接调用你本地已运行的 OpenClaw。

## 快速开始

### 1. 安装
```bash
cd mobile-office-bridge
npm install
```

### 2. 配置
```bash
cp .env.example .env
```

编辑 `.env`，只需要填写小移办公平台的账号信息：
```env
APP_KEY=你的appkey
APP_SECRET=你的appsecret
ROBOT_ID=你的机器人ID
AES_KEY=你的aeskey
CB_KEY=你的cbkey
```

可选：指定使用哪个 OpenClaw Agent（默认 `main`）
```env
AGENT_ID=main
```

### 3. 启动
```bash
npm start
```

### 4. 暴露公网
```bash
ngrok http 8080
```
把 ngrok 给你的公网地址（如 `https://xxx.ngrok-free.app/webhook`）告诉小移办公平台作为回调 URL。

## 验证
```bash
curl http://localhost:8080/health
```

## 可用性保障（Windows）

项目已提供一套最小可用保障脚本：

- `scripts/start-bridge.ps1`：启动桥接服务，并写入 `logs/bridge.log`
- `scripts/start-frpc.ps1`：启动 FRP 客户端，并写入 `logs/frpc.log`
- `scripts/watchdog.ps1`：检查 bridge `/health` 与 `frpc.exe`，异常时自动重启
- `scripts/install-tasks.ps1`：安装计划任务

安装计划任务：
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-tasks.ps1
```

任务说明：
- `MobileOfficeBridge`：用户登录时启动 bridge
- `MobileOfficeFrpc`：用户登录时启动 frpc
- `MobileOfficeWatchdog`：每分钟巡检并自愈

日志目录：
- `logs/bridge.log`
- `logs/frpc.log`
- `logs/watchdog.log`

## .env 配置项

| 变量 | 必填 | 说明 |
|------|------|------|
| APP_KEY | ✅ | 小移办公应用 Key |
| APP_SECRET | ✅ | 小移办公应用 Secret |
| ROBOT_ID | ✅ | 机器人 ID |
| AES_KEY | ✅ | 消息加解密密钥 (Base64) |
| CB_KEY | ✅ | 回调签名验证密钥 (Base64) |
| API_ROOT | ❌ | 平台API地址 (默认正式环境) |
| AGENT_ID | ❌ | OpenClaw Agent ID (默认 main) |
| PORT | ❌ | 服务端口 (默认 8080) |
