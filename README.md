# 小移办公机器人 ↔ OpenClaw 桥接服务

把小移办公平台的消息桥接到本地 OpenClaw agent。

## 工作原理

```
用户 @机器人 [消息]
       ↓
小移办公平台 (AES加密 + HMAC签名)
       ↓ POST /webhook
  桥接服务 (验签 → 解密)
       ↓ HTTP /v1/responses
  OpenClaw Gateway (本地)
       ↓
  桥接服务 (AES加密 → 下行API)
       ↓
小移办公平台 → 用户看到回复
```

**不需要配置额外 AI 后端**，直接调用本地 OpenClaw Gateway。

## 快速开始

### 1. 安装
```bash
cd D:\mobile-office-bridge-git
npm install
```

### 2. 配置
复制 `.env.example` 为 `.env`，填写：

```env
APP_KEY=你的appkey
APP_SECRET=你的appsecret
ROBOT_ID=你的机器人ID
AES_KEY=你的aeskey
CB_KEY=你的cbkey
AGENT_ID=main
PORT=8080
OPENCLAW_BASE_URL=http://127.0.0.1:18789
OPENCLAW_TOKEN=你的gateway token
```

### 3. 启动
```bash
npm start
```

### 4. 验证
```bash
curl http://127.0.0.1:8080/health
```

## Windows 守护方案（cmd/bat）

由于当前环境 PowerShell/计划任务权限不稳定，项目提供一套 **cmd/bat 最小守护方案**：

- `start-bridge.bat`：启动 bridge，并写入 `logs\bridge.log`
- `start-frpc.bat`：启动 FRP 客户端
- `watchdog.cmd`：巡检 `/health` 与 `frpc.exe`，异常时自动拉起
- `install-tasks.cmd`：安装计划任务（需要管理员权限）

### 手动验证

1. 启动 bridge
```bat
D:\mobile-office-bridge-git\start-bridge.bat
```

2. 启动 frpc
```bat
D:\mobile-office-bridge-git\start-frpc.bat
```

3. 运行一次 watchdog
```bat
D:\mobile-office-bridge-git\watchdog.cmd
```

4. 检查健康
```bat
curl http://127.0.0.1:8080/health
```

### 安装计划任务

> 需要管理员权限 cmd

```bat
D:\mobile-office-bridge-git\install-tasks.cmd
```

将创建：
- `MobileOfficeBridgeGit`：登录时启动 bridge
- `MobileOfficeFrpcGit`：登录时启动 frpc
- `MobileOfficeWatchdogGit`：每 2 分钟巡检一次

如果当前 shell 权限不足，`schtasks` 会提示“拒绝访问”，此时请在管理员 CMD 中重新执行。

## 日志

- `logs\bridge.log`
- `logs\watchdog.log`

## .env 配置项

| 变量 | 必填 | 说明 |
|------|------|------|
| APP_KEY | ✅ | 小移办公应用 Key |
| APP_SECRET | ✅ | 小移办公应用 Secret |
| ROBOT_ID | ✅ | 机器人 ID |
| AES_KEY | ✅ | 消息加解密密钥 (Base64) |
| CB_KEY | ✅ | 回调签名验证密钥 (Base64) |
| AGENT_ID | ❌ | OpenClaw Agent ID，默认 `main` |
| PORT | ❌ | 服务端口，默认 `8080` |
| OPENCLAW_BASE_URL | ❌ | OpenClaw Gateway 地址 |
| OPENCLAW_TOKEN | ❌ | OpenClaw Gateway Token |
| API_ROOT | ❌ | 平台 API 地址 |
