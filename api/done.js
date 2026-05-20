/**
 * api/done.js
 * Netlify Function: 标记任务已完成
 * POST /api/done { task_id: "xxx" }
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

async function updateGist(content) {
  const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: {
        'tasks.json': { content: JSON.stringify(content, null, 2) }
      }
    })
  });
  if (!res.ok) throw new Error(`Gist更新失败: ${res.status}`);
  return res.json();
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: '只支持 POST' }) };
  }

  if (!GITHUB_TOKEN || !GIST_ID) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'GitHub Gist 未配置' }) };
  }

  try {
    const { task_id, status, message } = JSON.parse(event.body || '{}');

    if (!task_id) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: '缺少 task_id' }) };
    }

    const gist = await getGist();
    let tasks = [];
    if (gist.files['tasks.json'] && gist.files['tasks.json'].content) {
      tasks = JSON.parse(gist.files['tasks.json'].content);
    }

    // 找到任务并更新
    const task = tasks.find(t => t.id === task_id);
    if (!task) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: `任务 ${task_id} 不存在` }) };
    }

    task.status = status || 'done';
    task.message = message || '';
    task.updated_at = new Date().toISOString();

    await updateGist(tasks);

    console.log(`✅ 任务 ${task_id} 已标记为 ${task.status}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, task_id, status: task.status })
    };

  } catch (error) {
    console.error('更新任务失败:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
