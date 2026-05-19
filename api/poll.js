/**
 * api/poll.js
 * 返回待处理任务（供本地后端轮询）
 * GET /api/poll?limit=5
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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: '只支持 GET' });
  }

  if (!GITHUB_TOKEN || !GIST_ID) {
    return res.status(500).json({ error: 'GitHub Gist 未配置' });
  }

  try {
    const gist = await getGist();
    const file = gist.files['tasks.json'];

    let tasks = [];
    if (file && file.content) {
      tasks = JSON.parse(file.content);
    }

    // 只返回 pending 状态的任务
    const pending = tasks
      .filter(t => t.status === 'pending')
      .slice(0, parseInt(req.query.limit) || 10)
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

    return res.status(200).json({
      pending_count: pending.length,
      tasks: pending
    });

  } catch (error) {
    console.error('轮询失败:', error);
    return res.status(500).json({ error: error.message });
  }
};
