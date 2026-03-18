'use strict';

const crypto = require('crypto');

function base64Decode(str) {
  return Buffer.from(str, 'base64');
}

function base64Encode(buf) {
  return buf.toString('base64');
}

/**
 * AES-128-ECB 解密 (PKCS5Padding)
 * @param {Buffer} key - 16字节密钥 (Base64解码后的aeskey)
 * @param {Buffer|String} encrypted - 加密数据 (Base64字符串或Buffer)
 * @returns {string} 解密后的明文UTF-8字符串
 */
function aesDecrypt(key, encrypted) {
  if (typeof encrypted === 'string') {
    encrypted = base64Decode(encrypted);
  }
  const decipher = crypto.createDecipheriv('aes-128-ecb', key, null);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf-8');
}

/**
 * AES-128-ECB 加密 (PKCS5Padding)
 * @param {Buffer} key - 16字节密钥
 * @param {string} plaintext - 明文
 * @returns {string} Base64编码的密文
 */
function aesEncrypt(key, plaintext) {
  const cipher = crypto.createCipheriv('aes-128-ecb', key, null);
  let encrypted = cipher.update(plaintext, 'utf-8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return base64Encode(encrypted);
}

/**
 * 验证 HMAC-SHA1 签名
 * @param {string} cbKeyBase64 - Base64编码的cbkey
 * @param {string} timestamp - 请求时间戳
 * @param {string} nonce - 唯一请求标识
 * @param {string} signature - 平台发送的签名 (hex或base64格式)
 * @returns {boolean}
 */
function verifySignature(cbKeyBase64, timestamp, nonce, signature) {
  const key = base64Decode(cbKeyBase64);
  const text = timestamp + nonce;
  const hmac = crypto.createHmac('sha1', key).update(text, 'utf-8');
  
  // 平台可能发送 hex 或 base64 格式的签名，都验证一下
  const expectedBase64 = hmac.digest('base64');
  const expectedHex = crypto.createHmac('sha1', key).update(text, 'utf-8').digest('hex');
  
  return signature === expectedBase64 || signature.toLowerCase() === expectedHex.toLowerCase();
}

/**
 * 解密平台上行消息
 * @param {string} aesKeyBase64 - Base64编码的AES密钥
 * @param {string} encryptedBase64 - 请求体中的加密文本
 * @returns {object} 解密后的JSON对象
 */
function decryptMessage(aesKeyBase64, encryptedBase64) {
  const key = base64Decode(aesKeyBase64);
  return JSON.parse(aesDecrypt(key, encryptedBase64.trim()));
}

/**
 * 加密下行消息
 * @param {string} aesKeyBase64 - Base64编码的AES密钥
 * @param {object} payload - 消息JSON对象
 * @returns {string} Base64编码的密文
 */
function encryptMessage(aesKeyBase64, payload) {
  const key = base64Decode(aesKeyBase64);
  return aesEncrypt(key, JSON.stringify(payload));
}

module.exports = {
  base64Decode,
  base64Encode,
  aesDecrypt,
  aesEncrypt,
  verifySignature,
  decryptMessage,
  encryptMessage,
};
