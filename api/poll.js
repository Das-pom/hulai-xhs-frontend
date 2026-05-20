/**
 * api/poll.js
 * Netlify Function: 返回待处理任务（供本地后端轮询）
 * GET /api/poll?limit=5
 */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GIST_ID = process.env.GIST_ID || 'd0d605bb62fb629db1989b35bbcc8c19';

async function getGist() {
  const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
    }
  });
  if (!res.ok) throw new Error(`Gist获取失败: ${res.status}`);
  return res.json();
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: '只支持 GET' }) };
  }

  if (!GITHUB_TOKEN || !GIST_ID) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'GitHub Gist 未配置' }) };
  }

  try {
    const gist = await getGist();
    const file = gist.files['tasks.json'];

    let tasks = [];
    if (file && file.content) {
      tasks = JSON.parse(file.content);
    }

    // 解析查询参数
    const urlParams = new URLSearchParams(event.queryStringParameters || {});
    const limit = parseInt(urlParams.get('limit')) || 10;

    // 只返回 pending 状态的任务
    const pending = tasks
      .filter(t => t.status === 'pending')
      .slice(0, limit)
      .map(t => ({
        id: t.id,
        title: t.title,
        content: t.content,
        tags: t.tags,
        location: t.location,
        cover_base64: t.cover_base64,
        display_base64: t.display_base64,
        created_at: t.created_at
      }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        pending_count: pending.length,
        tasks: pending
      })
    };

  } catch (error) {
    console.error('轮询失败:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
