'use strict';

require('dotenv').config();
const express = require('express');
const cryptoLib = require('./lib/crypto');
const { sendText } = require('./lib/sender');
const { sendMessage } = require('./lib/openclaw');
const { getSessionId } = require('./lib/sessions');

const app = express();
// 注意：不使用全局 express.json()，webhook 收到的是 AES 加密密文（text/plain）
// /webhook 路由单独使用 express.raw 处理原始 body

// ============ 配置 ============
const config = {
  platform: {
    appKey: process.env.APP_KEY,
    appSecret: process.env.APP_SECRET,
    robotId: process.env.ROBOT_ID,
    aesKey: process.env.AES_KEY,
    cbKey: process.env.CB_KEY,
    apiRoot: process.env.API_ROOT || 'https://o.andfx.net/openapi/robot',
  },
  agentId: process.env.AGENT_ID || 'main',  // 使用的 OpenClaw Agent ID
  port: parseInt(process.env.PORT) || 8080,
};

// ============ 配置校验 ============
const required = ['APP_KEY', 'APP_SECRET', 'ROBOT_ID', 'AES_KEY', 'CB_KEY'];
const missing = required.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`❌ 缺少必要配置: ${missing.join(', ')}`);
  console.error('   请复制 .env.example 为 .env 并填写配置');
  process.exit(1);
}

// ============ 路由 ============

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    sessions: require('./lib/sessions').getSessionCount(),
    robot: config.platform.robotId,
    agent: config.agentId,
  });
});

// 核心路由：接收小移办公平台消息（手动读取原始 body）
app.post('/webhook', async (req, res) => {
  try {
    // 0. 手动读取原始 body
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);
    
    // 1. 验证签名
    const { timestamp, nonce, signature } = {
      timestamp: req.headers['timestamp'],
      nonce: req.headers['nonce'],
      signature: req.headers['signature'],
    };

    // 调试：打印收到的 headers
    console.log('[Webhook] Headers:', JSON.stringify({ timestamp, nonce, signature }));
    console.log('[Webhook] CB_KEY:', config.platform.cbKey);
    console.log('[Webhook] Raw body length:', rawBody.length);
    console.log('[Webhook] Raw body preview:', rawBody.toString('utf-8').substring(0, 100));

    if (!timestamp || !nonce || !signature) {
      console.warn('[Webhook] ⚠️ 缺少签名头');
      return res.json({ code: -1, msg: '缺少签名头' });
    }

    const sigResult = cryptoLib.verifySignature(config.platform.cbKey, timestamp, nonce, signature);
    console.log('[Webhook] Signature result:', sigResult);
    if (!sigResult) {
      // 调试：计算期望的签名
      const crypto = require('crypto');
      const key = Buffer.from(config.platform.cbKey, 'base64');
      const text = timestamp + nonce;
      const expected = crypto.createHmac('sha1', key).update(text, 'utf-8').digest('base64');
      console.log('[Webhook] Expected sig:', expected, 'Received:', signature);
      console.warn('[Webhook] ❌ 签名验证失败');
      return res.json({ code: -1, msg: '签名验证失败' });
    }

    // 2. 解密
    const encryptedBody = rawBody.toString('utf-8').trim();
    console.log('[Webhook] Encrypted body length:', encryptedBody.length);
    
    if (!encryptedBody) {
      return res.json({ code: 0, msg: '空消息' });
    }

    const msg = cryptoLib.decryptMessage(config.platform.aesKey, encryptedBody);
    console.log(`[Webhook] ✅ sender=${msg.sender} type=${msg.message_type} text="${(msg.text || '').substring(0, 80)}"`);

    // 3. 立即返回成功（异步处理）
    res.json({ code: 0, msg: 'success' });

    // 4. 处理消息
    handleMessage(msg).catch(err => console.error('[Handle] ❌', err.message));

  } catch (err) {
    console.error('[Webhook] ❌', err.message);
    res.json({ code: -1, msg: err.message });
  }
});

// ============ 消息处理 ============
async function handleMessage(msg) {
  const { sender, receiver, text, message_type, content_type, sub_type, content } = msg;

  // 提取实际文本内容
  let actualText = text;
  
  // 处理 @消息模板 (application/at)
  if (content_type === 'template' && sub_type === 'application/at') {
    // @消息文本在 map.body 中
    actualText = msg.map?.body || '';
    console.log(`[Handle] @消息原始内容: "${actualText?.substring(0, 100)}"`);
    
    // 去掉 @机器人名 前缀 (格式: "@@机器人名 实际消息" 或 "@机器人名 实际消息")
    actualText = actualText.replace(/^@+[^\s]+\s*/, '').trim();
    console.log(`[Handle] @消息处理后: "${actualText?.substring(0, 100)}"`);
  }
  
  // 只处理文本消息
  if (!actualText?.trim()) {
    console.log(`[Handle] 跳过: content_type=${content_type}, sub_type=${sub_type}, 无文本内容`);
    return;
  }

  const sessionId = getSessionId(sender, receiver);

  try {
    // 调用 OpenClaw HTTP API
    console.log(`[Handle] 调用 OpenClaw: session=${sessionId}, msg="${actualText.substring(0, 50)}"`);
    const reply = await sendMessage(actualText, sessionId);

    // 回复到小移办公
    await sendText(config.platform, {
      receiver,
      text: reply,
      messageType: message_type,
    });

    console.log(`[Handle] ✅ 已回复 ${sender}`);

  } catch (err) {
    console.error(`[Handle] ❌ ${sender}: ${err.message}`);
    try {
      await sendText(config.platform, {
        receiver,
        text: `⚠️ 处理出错: ${err.message}`,
        messageType: message_type,
      });
    } catch (_) {}
  }
}

// ============ 启动 ============
app.listen(config.port, () => {
  console.log('');
  console.log('🚀 小移办公 ↔ OpenClaw 桥接服务');
  console.log(`   Webhook:  http://localhost:${config.port}/webhook`);
  console.log(`   Health:   http://localhost:${config.port}/health`);
  console.log(`   Agent:    ${config.agentId}`);
  console.log(`   Robot:    ${config.platform.robotId}`);
  console.log('');
  console.log('📋 启动清单:');
  console.log('   1. 确保 OpenClaw gateway 正在运行');
  console.log('   2. 确保 .env 已配置 (APP_KEY/SECRET/AES_KEY/CB_KEY/ROBOT_ID)');
  console.log('   3. 暴露公网 (ngrok http 8080)');
  console.log('   4. 把公网 URL 告诉小移办公平台作为回调地址');
  console.log('');
});
