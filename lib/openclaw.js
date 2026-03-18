/**
 * OpenClaw HTTP API 客户端
 * 使用 Gateway 的 /v1/responses 端点
 */
const http = require('http');

const GATEWAY_HOST = 'localhost';
const GATEWAY_PORT = 18789;
const GATEWAY_TOKEN = 'b98613b26f0264a8548df15f9c6f7570cc2e652939f80ad1';
const AGENT_ID = 'main';

/**
 * 发送消息到 OpenClaw 并获取回复
 * @param {string} message - 用户消息
 * @param {string} sessionKey - 会话标识（用户手机号）
 * @param {number} timeout - 超时时间（秒）
 * @returns {Promise<string>} - OpenClaw 的回复文本
 */
async function sendMessage(message, sessionKey, timeout = 120) {
  return new Promise((resolve, reject) => {
    const requestData = JSON.stringify({
      model: 'openclaw',
      input: message,
      user: sessionKey  // 用于稳定会话路由
    });

    const options = {
      hostname: GATEWAY_HOST,
      port: GATEWAY_PORT,
      path: '/v1/responses',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        'x-openclaw-agent-id': AGENT_ID,
        'Content-Length': Buffer.byteLength(requestData)
      },
      timeout: timeout * 1000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');

      res.on('data', (chunk) => {
        data += chunk;
        console.log(`[OpenClaw] 收到数据块: ${chunk.length} 字节`);
      });

      res.on('end', () => {
        console.log(`[OpenClaw] 响应完成，总长度: ${data.length}`);
        console.log(`[OpenClaw] 响应内容: ${data.substring(0, 200)}...`);
        
        try {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            return;
          }

          const response = JSON.parse(data);
          
          // 提取回复文本
          let replyText = '';
          if (response.output && Array.isArray(response.output)) {
            for (const item of response.output) {
              if (item.type === 'message' && item.role === 'assistant') {
                if (item.content && Array.isArray(item.content)) {
                  for (const content of item.content) {
                    if (content.type === 'output_text' && content.text) {
                      replyText += content.text;
                    }
                  }
                }
              }
            }
          }

          if (!replyText && response.error) {
            reject(new Error(`OpenClaw error: ${response.error.message}`));
            return;
          }

          resolve(replyText || '无回复内容');
        } catch (err) {
          reject(new Error(`解析响应失败: ${err.message}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`请求失败: ${err.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时'));
    });

    req.write(requestData);
    req.end();
  });
}

module.exports = { sendMessage };
