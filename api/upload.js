import https from 'https';

function httpsRequest(url, options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.GH_TOKEN;
  const owner = 'ondrejwicherek';
  const repo  = 'samba-transformer';
  const filePath = 'samba-import.xml';

  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Missing content field' });

    const ghHeaders = {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'samba-transformer'
    };

    // GET current file SHA
    const getRes = await httpsRequest(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      { method: 'GET', headers: ghHeaders }
    );
    let sha;
    if (getRes.ok) sha = JSON.parse(getRes.body).sha;

    // PUT updated file
    const putPayload = JSON.stringify(sha
      ? { message: 'Update samba-import.xml', content, sha }
      : { message: 'Update samba-import.xml', content }
    );
    const putBuf = Buffer.from(putPayload, 'utf8');

    const putRes = await httpsRequest(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        method: 'PUT',
        headers: { ...ghHeaders, 'Content-Type': 'application/json', 'Content-Length': putBuf.length }
      },
      putBuf
    );

    if (!putRes.ok) {
      return res.status(500).json({ error: JSON.parse(putRes.body).message || putRes.body });
    }

    return res.status(200).json({
      url: `https://${owner}.github.io/${repo}/${filePath}`
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
