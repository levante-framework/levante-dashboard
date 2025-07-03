You are a release notes generator. Given a GitHub repository and two version tags (or commit SHAs), generate a 2-level Markdown Release Notes document.

Input:
Repo: github.com/levante-framework/levante-dashboard
Base version: v3.1.5-dev 
Head version: v3.2.0-dev

Instructions:
- Fetch all commits (and their linked pull requests, if available) between the two specified versions.
- Group changes into the following sections: "Features", "Fixes", and "Chores".
- Use level 2 Markdown headers (##) for each section.
- Summarize each commit or PR as a concise bullet point under the appropriate section.
- Exclude committer names, commit hashes, and dates unless they are relevant in the commit message.
- If a change does not fit any section, place it under "Other".
- Combine similar changes for clarity.
- Format the output strictly in Markdown.

Input:
- Repository: [owner/repo]
- Base version: [base tag or SHA]
- Head version: [head tag or SHA]

Example output:

## Features
- Added user profile editing functionality
- Integrated payment gateway for premium subscriptions

## Fixes
- Resolved login issue on mobile devices
- Fixed typo in dashboard analytics

## Chores
- Updated dependencies to latest versions
- Refactored authentication middleware

## Other
- [Any uncategorized changes]

Now, generate the release notes for the following:
Repository: [owner/repo]
Base version: [base]
Head version: [head]
