'use strict';

/**
 * 会话管理：将平台发送方号码映射到 AI 会话
 * 使用 Map 存储，重启后重置（如需持久化可替换为 Redis/文件）
 */
const sessions = new Map();

/**
 * 获取或创建会话ID
 * @param {string} sender - 发送方号码
 * @param {string} chatId - 聊天对象（群ID或机器人ID）
 * @returns {string} 会话ID
 */
function getSessionId(sender, chatId) {
  const key = `${sender}:${chatId}`;
  let sid = sessions.get(key);
  if (!sid) {
    sid = `${sender}_${Date.now()}`;
    sessions.set(key, sid);
    console.log(`[Session] 新建会话: ${key} -> ${sid}`);
  }
  return sid;
}

/**
 * 获取当前会话数量
 */
function getSessionCount() {
  return sessions.size;
}

module.exports = { getSessionId, getSessionCount };
