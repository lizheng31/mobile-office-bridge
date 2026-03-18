'use strict';

const crypto = require('./crypto');
const { getToken } = require('./token');

/**
 * 发送消息到小移办公平台
 * @param {object} platformConfig - { appKey, appSecret, robotId, aesKey, apiRoot }
 * @param {object} payload - 消息负载
 * @returns {Promise<object>} 平台返回结果
 */
async function sendRaw(platformConfig, payload) {
  const accesstoken = await getToken(platformConfig);
  const { apiRoot, robotId } = platformConfig;

  const encryptedBody = crypto.encryptMessage(platformConfig.aesKey, payload);
  const url = `${apiRoot}/chat/api/outbound/v1/${robotId}`;

  console.log(`[Sender] POST ${url}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'Accept': 'application/json;charset=UTF-8',
      'accesstoken': accesstoken,
    },
    body: encryptedBody,
    signal: AbortSignal.timeout(15000),
  });

  const data = await response.json();

  if (data.code !== 0) {
    throw new Error(`发送失败: code=${data.code}, msg=${data.msg}`);
  }

  console.log(`[Sender] 成功, message_id=${data.data?.message_id}`);
  return data;
}

/**
 * 便捷：发送文本消息
 */
async function sendText(platformConfig, { receiver, text, uuid, messageType = 2 }) {
  const { v4: uuidv4 } = require('uuid');
  return sendRaw(platformConfig, {
    uuid: uuid || uuidv4().replace(/-/g, ''),
    sender: platformConfig.robotId,
    receiver,
    message_type: messageType,
    content_type: 'text',
    text: String(text).substring(0, 10240),
  });
}

module.exports = { sendRaw, sendText };
