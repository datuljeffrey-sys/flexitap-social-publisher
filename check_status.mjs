import fs from 'node:fs';

// Load .env
if (fs.existsSync('.env')) {
  for (const line of fs.readFileSync('.env', 'utf-8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq > 0) process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
}

const token = process.env.BUFFER_API_KEY;

async function check() {
  const orgRes = await fetch('https://api.buffer.com', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ account { organizations { id name } } }' })
  });
  const orgData = await orgRes.json();
  const orgId = orgData.data.account.organizations[0].id;

  const chRes = await fetch('https://api.buffer.com', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query GetPosts($input: PostsInput!) {
        posts(input: $input) {
          totalCount
          edges {
            node {
              id
              channelId
              text
              status
              createdAt
              dueAt
            }
          }
        }
      }`,
      variables: { input: { organizationId: orgId } }
    })
  });

  const pData = await chRes.json();
  const edges = pData.data?.posts?.edges || [];
  console.log(`Total posts found: ${edges.length}`);
  for (const e of edges) {
    const p = e.node;
    console.log(`- Created: ${p.createdAt} | Status: ${p.status} | Text: "${p.text.slice(0, 50)}..."`);
  }
}

check().catch(err => console.error(err));
