/**
 * api/submit.js
 * 接收小红书任务，存入 GitHub Gist
 */

const GITHUB_TOKEN = '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';
const GIST_ID = 'd0d605bb62fb629db1989b35bbcc8c19';

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

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持 POST' });
  }

  if (!GITHUB_TOKEN || !GIST_ID) {
    return res.status(500).json({
      error: 'GitHub Gist 未配置（环境变量 GITHUB_TOKEN 或 GIST_ID 缺失）'
    });
  }

  try {
    const { title, content, tags, location, cover_base64, display_base64 } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: '标题和正文不能为空' });
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
      // Gist 为空或文件不存在，从头开始
      tasks = [];
    }

    // 添加新任务
    const task = {
      id: taskId,
      title: String(title).trim(),
      content: String(content).trim(),
      tags: String(tags || '').trim(),
      location: String(location || '').trim(),
      // base64 图片数据（可选，体积较大）
      cover_base64: cover_base64 || '',
      display_base64: display_base64 || '',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    tasks.push(task);

    // 更新 Gist
    await updateGist(tasks);

    console.log(`✅ 新任务已存储: ${taskId} - ${title}`);

    return res.status(200).json({
      success: true,
      task_id: taskId,
      message: '任务已提交，请等待本地工具处理'
    });

  } catch (error) {
    console.error('提交失败:', error);
    return res.status(500).json({ error: error.message });
  }
};
