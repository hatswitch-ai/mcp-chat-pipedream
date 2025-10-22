<a href="https://chat.pipedream.com/">
  <img alt="MCP Chat by Pipedream" src="app/(chat)/opengraph-image.png">
  <h1 align="center">MCP Chat by Pipedream</h1>
</a>

<p align="center">
  MCP Chat is a free, open-source chat app built using the AI SDK, and Pipedream MCP, which provides access to nearly 3,000 APIs and more than 10,000 tools. Use this as a reference to build powerful AI chat applications.
</p>

<p align="center">
  <a href="#features"><strong>Features</strong></a> ·
  <a href="#model-providers"><strong>Model Providers</strong></a> ·
  <a href="#prerequisites"><strong>Prerequisites</strong></a> ·
  <a href="#deploy-your-own"><strong>Deploy Your Own</strong></a> ·
  <a href="#running-locally"><strong>Running Locally</strong></a>
</p>
<br/>

> **Check out the app in production at [chat.pipedream.com](https://chat.pipedream.com) and refer to [Pipedream's developer docs](https://pipedream.com/docs/connect/mcp/developers) for the most up to date information.**

## Features

- **MCP integrations**: Connect to thousands of APIs through Pipedream's MCP server with built-in auth
- **Sidebar Connections**: Browse and connect to 2,800+ APIs directly from the sidebar with branded OAuth flows
- **Automatic tool discovery**: Execute tool calls across different APIs via chat
- **Uses the [AI SDK](https://sdk.vercel.ai/docs)**: Unified API for generating text, structured objects, and tool calls with LLMs
- **Flexible LLM and framework support**: Works with any LLM provider or framework
- **Data persistence**: Uses [Neon Serverless Postgres](https://vercel.com/marketplace/neon) for saving chat history and user data and [Auth.js](https://authjs.dev) for simple and secure sign-in

## Model Providers

The demo app currently uses models from Anthropic, OpenAI, and Gemini, but the AI SDK supports [many more](https://sdk.vercel.ai/providers/ai-sdk-providers).

### Prerequisites

To run or deploy this app, you'll need:

1. A [Pipedream account](https://pipedream.com/auth/signup)
2. A [Pipedream project](https://pipedream.com/docs/projects/#creating-projects). Accounts connected via MCP will be stored here.
3. [Pipedream OAuth credentials](https://pipedream.com/docs/rest-api/auth/#oauth)
4. An [OpenAI API key](https://platform.openai.com/api-keys)

## Deploy Your Own

One-click deploy this app to Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FPipedreamHQ%2Fmcp-chat&env=PIPEDREAM_CLIENT_ID,PIPEDREAM_CLIENT_SECRET,PIPEDREAM_PROJECT_ID,PIPEDREAM_PROJECT_ENVIRONMENT,AUTH_SECRET,GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET,OPENAI_API_KEY,EXA_API_KEY,POSTGRES_URL&envDescription=API%20keys%20need%20to%20run%20the%20app)

## Running locally

1. Copy the environment file and add your credentials:

```bash
cp .env.example .env  # Edit with your values
```

Note that for easier development, chat persistence and application sign-in are disabled by default in the `.env.example` file:

```bash
# In your .env file
DISABLE_AUTH=true
DISABLE_PERSISTENCE=true
```

2. Install dependencies and start the app:

```bash
pnpm install
pnpm dev
```

Your local app should now be running on [http://localhost:3000](http://localhost:3000/) 🎉

## Sidebar Connections

This app includes a powerful sidebar connections feature that allows users to browse and connect to 2,800+ APIs through Pipedream's OAuth system. For detailed information about the connections feature, see [PIPEDREAM_CONNECTIONS_README.md](./PIPEDREAM_CONNECTIONS_README.md).

### Quick Setup for Connections

1. Set the required environment variables:
```bash
PIPEDREAM_CLIENT_ID=your_client_id
PIPEDREAM_CLIENT_SECRET=your_client_secret
PIPEDREAM_PROJECT_ID=your_project_id
PIPEDREAM_PROJECT_ENVIRONMENT=production
```

2. Configure app filtering (optional):
```bash
PIPEDREAM_ALLOW_ALL_APPS=true  # Show all apps with search
# OR
PIPEDREAM_ALLOW_ALL_APPS=false
PIPEDREAM_APP_FILTER=Google    # Show only Google apps
```

3. The connections section will appear in the sidebar automatically!

### Enabling chat persistence

1. Run all required local services:

```bash
docker compose up -d
```

2. Run migrations:

```bash
POSTGRES_URL=postgresql://postgres@localhost:5432/postgres pnpm db:migrate
```
