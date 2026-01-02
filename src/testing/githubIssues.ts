export type GitHubIssueState = 'open' | 'closed';

export interface GitHubIssue {
  number: number;
  state: GitHubIssueState;
  html_url: string;
  title: string;
}

export async function fetchIssue(params: { owner: string; repo: string; number: number }): Promise<GitHubIssue> {
  const url = `https://api.github.com/repos/${params.owner}/${params.repo}/issues/${params.number}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub issue fetch failed: ${res.status} ${res.statusText} url=${url} body=${text}`);
  }

  const json = (await res.json()) as any;
  return {
    number: json.number,
    state: json.state,
    html_url: json.html_url,
    title: json.title,
  };
}

