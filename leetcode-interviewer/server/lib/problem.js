// The problem statement, from LeetCode's public GraphQL API.

const ENTITIES = { '&nbsp;': ' ', '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"', '&#39;': "'" };

/** LeetCode's problem HTML as plain text. Pure. */
export function problemText(html) {
  return html
    .replace(/<\/(p|li|pre|ul|ol)>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(nbsp|lt|gt|amp|quot|#39);/g, (entity) => ENTITIES[entity])
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** No cookies: the same public request an anonymous visitor's page makes. */
export async function fetchProblem(slug) {
  const response = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'query q($slug: String!) { question(titleSlug: $slug) { title difficulty content } }',
      variables: { slug },
    }),
  });
  if (!response.ok) throw new Error(`LeetCode returned ${response.status} for problem "${slug}"`);
  const question = (await response.json()).data?.question;
  if (!question?.content) throw new Error(`LeetCode has no statement for problem "${slug}" (is it Premium?)`);
  return { title: question.title, difficulty: question.difficulty, text: problemText(question.content) };
}
