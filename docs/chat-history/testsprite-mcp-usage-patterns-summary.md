# TestSprite-MCP usage patterns — recovered context (summary)

This file is a compact summary of the recovered Cursor internal chat export:
`/mnt/c/users/digit/Downloads/cursor_testsprite_mcp_usage_patterns.md` (8.8MB).

## MCP setup takeaways
- Cursor reads MCP config from `~/.cursor/mcp.json` on startup; restarting Cursor is required after edits.
- The chat noted `~/.cursor/mcp.json` had previously been invalid JSON (“multiple JSON objects glued together”) and was rewritten into a single valid JSON object.
- TestSprite MCP may require **Node 22**.
- API key handling:
  - The config included `"TESTSPRITE_API_KEY": "__SET_ME__"` and needs a real key.
  - A real key was previously pasted into chat/logs, so the recommendation was to **rotate the key** and use the new one.
- After restart, the guidance was to search the Command Palette for **MCP** and validate the provider/tool is actually attached. Some Cursor builds may not expose MCP commands even if the server runs.

## Levante dev login PRD (minimal)
- Entry point: `/signin`
- Users log in with **email + password**
- Success: form submits, app navigates away from `/signin`, and post-login landing UI is visible.

## TestSprite report snippet (as captured)
- A generated report indicated login automation failed due to `auth/wrong-password` and showed an “Incorrect username/email or password” message.

## Where the export started to degrade
- Near the end of the export, the chat showed: “Chat seems corrupted … are we running …”

