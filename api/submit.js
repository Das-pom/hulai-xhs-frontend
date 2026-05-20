/**
 * api/submit.js
 * Netlify Function: 接收小红书任务，存入 GitHub Gist
 */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GIST_ID = process.env.GIST_ID || 'd0d605bb62fb629db1989b35bbcc8c19';

function getHeaders() {
  return {
    'Authorization': `token ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
}

async function getGist() {
  const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error(`Gist获取失败: ${res.status}`);
  return res.json();
}

async function updateGist(content) {
  const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({
      files: {
        'tasks.json': {
          content: JSON.stringify(content, null, 2)
        }
      }
    })
  });
  if (!res.ok) throw new Error(`Gist更新失败: ${res.status}`);
  return res.json();
}

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: '只支持 POST' }) };
  }

  if (!GITHUB_TOKEN || !GIST_ID) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'GitHub Gist 未配置' })
    };
  }

  try {
    const { title, content, tags, location, cover_base64, display_base64 } = JSON.parse(event.body || '{}');

    if (!title || !content) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '标题和正文不能为空' })
      };
    }

    // 生成任务ID
    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // 读取现有 Gist 内容
    let tasks = [];
    try {
      const gist = await getGist();
      const file = gist.files['tasks.json'];
      if (file && file.content) {
        tasks = JSON.parse(file.content);
      }
    } catch (e) {
      tasks = [];
    }

    // 添加新任务
    const task = {
      id: taskId,
      title: String(title).trim(),
      content: String(content).trim(),
      tags: String(tags || '').trim(),
      location: String(location || '').trim(),
      cover_base64: cover_base64 || '',
      display_base64: display_base64 || '',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    tasks.push(task);
    await updateGist(tasks);

    console.log(`✅ 新任务已存储: ${taskId}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        task_id: taskId,
        message: '任务已提交，请等待本地工具处理'
      })
    };

  } catch (error) {
    console.error('提交失败:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
