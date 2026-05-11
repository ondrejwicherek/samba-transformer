export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.GH_TOKEN;
  const owner = 'ondrejwicherek';
  const repo  = 'samba-transformer';
  const path  = 'samba-import.xml';

  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Missing content field' });

    // content is already base64-encoded UTF-8 XML from the client
    let sha;
    const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github+json' }
    });
    if (getRes.ok) sha = (await getRes.json()).sha;

    const putBody = { message: 'Update samba-import.xml', content };
    if (sha) putBody.sha = sha;

    const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(putBody)
    });

    if (!putRes.ok) {
      const err = await putRes.json();
      return res.status(500).json({ error: err.message });
    }

    return res.status(200).json({
      url: `https://${owner}.github.io/${repo}/${path}`
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
