# Zenith Bot

  The official Discord bot for Zenith ERLC Staff Management.

  ## Commands

  | Command | Description |
  |---------|-------------|
  | `/staff add` | Add a member to the staff roster |
  | `/staff remove` | Remove from the roster |
  | `/staff info` | View a member's full profile |
  | `/staff list` | List all active staff |
  | `/staff promote` | Update a member's rank |
  | `/strike issue` | Issue a strike |
  | `/strike list` | View active strikes |
  | `/strike revoke` | Revoke a strike by ID |
  | `/loa request` | Submit an LOA request |
  | `/loa list` | View LOA requests |
  | `/loa approve` | Approve a request (admin) |
  | `/loa deny` | Deny a request (admin) |
  | `/ranks` | View rank hierarchy |
  | `/activity log` | Log a custom activity |
  | `/activity leaderboard` | View leaderboard |
  | `/config` | View configuration |
  | `/help` | Show all commands |

  ## Setup

  1. Copy `.env.example` to `.env` and fill in your values
  2. `pnpm install`
  3. `pnpm run deploy-commands` — register slash commands with Discord
  4. `pnpm run dev` — start the bot

  ## Environment Variables

  ```
  DISCORD_BOT_TOKEN=your_bot_token
  DISCORD_CLIENT_ID=your_client_id
  DATABASE_URL=your_postgres_url
  API_URL=https://your-api-server.com/api
  SESSION_SECRET=your_session_secret
  ```
  