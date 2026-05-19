/**
 * api/done.js
 * 标记任务已完成
 * POST /api/done { task_id: "xxx" }
 */

const GITHUB_TOKEN = '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';
const GIST_ID = 'd0d605bb62fb629db1989b35bbcc8c19';

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

module.exports = async (req, res) => {
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
    return res.status(500).json({ error: 'GitHub Gist 未配置' });
  }

  try {
    const { task_id, status, message } = req.body;

    if (!task_id) {
      return res.status(400).json({ error: '缺少 task_id' });
    }

    const gist = await getGist();
    let tasks = [];
    if (gist.files['tasks.json'] && gist.files['tasks.json'].content) {
      tasks = JSON.parse(gist.files['tasks.json'].content);
    }

    // 找到任务并更新
    const task = tasks.find(t => t.id === task_id);
    if (!task) {
      return res.status(404).json({ error: `任务 ${task_id} 不存在` });
    }

    task.status = status || 'done';
    task.message = message || '';
    task.updated_at = new Date().toISOString();

    await updateGist(tasks);

    console.log(`✅ 任务 ${task_id} 已标记为 ${task.status}`);

    return res.status(200).json({ success: true, task_id, status: task.status });

  } catch (error) {
    console.error('更新任务失败:', error);
    return res.status(500).json({ error: error.message });
  }
};
