'use strict';
const http = require('http');
const https = require('https');

let cachedToken = null;
let tokenExpiresAt = 0;
let refreshPromise = null;

/**
 * 获取 accesstoken，带缓存和自动续期
 * @param {object} platformConfig - { appKey, appSecret, apiRoot }
 * @returns {Promise<string>} accesstoken
 */
async function getToken(platformConfig) {
  // 提前60秒刷新
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  // 避免并发刷新
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = _fetchToken(platformConfig);
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function _fetchToken({ appKey, appSecret, apiRoot }) {
  const url = new URL(`${apiRoot}/auth/gettoken?appkey=${encodeURIComponent(appKey)}&appsecret=${encodeURIComponent(appSecret)}`);
  const client = url.protocol === 'https:' ? https : http;

  console.log('[Token] 正在获取 accesstoken...');
  console.log(`[Token] URL: ${url.toString().replace(appSecret, '***')}`);

  return new Promise((resolve, reject) => {
    const req = client.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`[Token] 响应状态: ${res.statusCode}`);
        console.log(`[Token] 响应内容: ${data.substring(0, 200)}`);
        
        try {
          const json = JSON.parse(data);
          
          if (json.code !== 0 || !json.access_token) {
            reject(new Error(`获取token失败: code=${json.code}, msg=${json.msg}`));
            return;
          }

          cachedToken = json.access_token;
          tokenExpiresAt = Date.now() + json.expires_in * 1000;

          console.log(`[Token] 获取成功, 有效期 ${json.expires_in}s`);
          resolve(cachedToken);
        } catch (err) {
          reject(new Error(`解析token响应失败: ${err.message}, 原始数据: ${data.substring(0, 100)}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`请求token失败: ${err.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('获取token超时'));
    });
  });
}

module.exports = { getToken };
