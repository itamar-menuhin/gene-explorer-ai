# Gene Explorer AI

An AI-powered bioinformatics platform for analyzing genetic sequences with advanced feature extraction capabilities.

## 📖 Documentation

- **[Complete Architecture Guide](docs/ARCHITECTURE.md)** - Comprehensive overview of the system architecture, components, and data flow
- **[Python Backend Integration](docs/PYTHON_BACKEND_INTEGRATION.md)** - Step-by-step guide for integrating and deploying the Python backend
- **[Python API Specification](docs/python-api-spec.md)** - Detailed API contract and feature panel specifications
- **[AI Agent Prompts](AI_PROMPTS.md)** - Documentation of all AI agent prompts and their organization

## Project info

This project is built with [Lovable](https://lovable.dev) and can be edited through the platform or locally.

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit your Lovable Project and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

**Frontend:**
- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase (Auth + Database)

**Backend:**
- FastAPI (Python)
- BioPython
- Supabase Edge Functions (Deno)
- PostgreSQL

## Quick Start

### Frontend Development

```sh
# Install dependencies
npm install

# Start development server
npm run dev
```

### Python Backend Development

```sh
# Install Python dependencies
cd backend
pip install -r requirements.txt

# Start FastAPI server
python main.py
```

The backend will run on `http://localhost:8080` by default

### Environment Variables

Create a `.env` file in the project root:

```bash
# Supabase Configuration (required)
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key

# Python Backend URL (optional, for local development)
# If not set, uses local computation fallback
# For production, set this to your deployed backend URL
VITE_PYTHON_BACKEND_URL=http://localhost:8080
```

For Supabase Edge Functions, set the `PYTHON_BACKEND_URL` environment variable in the Supabase dashboard.

## Features

- 🧬 **Multiple Sequence Formats** - Support for FASTA, GenBank, and plain text
- 🤖 **AI-Guided Analysis** - Get panel recommendations based on your research hypothesis
- 📊 **Advanced Feature Extraction** - GC content, codon usage bias, chemical properties, and more
- 🪟 **Windowed Analysis** - Analyze sequences with sliding windows
- 💾 **Save & Share** - Save analyses and share publicly with secure tokens
- 📈 **Interactive Visualizations** - Line charts, distributions, and statistical summaries
- 📦 **Export Options** - Export results as CSV, JSON, or images

## Architecture Overview

```
Frontend (React/TypeScript)
    ↓
Supabase Edge Functions (Deno)
    ↓
Python Backend (FastAPI) ← Optional but Recommended
    ↓
Feature Engineering Modules (BioPython)
```

The application uses a flexible architecture that works with or without the Python backend:
- **Without Python backend**: Uses local JavaScript computation for basic features
- **With Python backend**: Unlocks full feature set with advanced bioinformatics algorithms

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for complete details.

## Deployment

### Frontend Deployment

Simply open your Lovable project and click on Share -> Publish.

### Python Backend Deployment

The Python backend can be deployed to various platforms. See [docs/PYTHON_BACKEND_INTEGRATION.md](docs/PYTHON_BACKEND_INTEGRATION.md) for detailed instructions.

**Quick Deploy Options:**

1. **Railway** (Recommended, ~5 minutes) ✅ *Successfully deployed*
   - Connect GitHub repo
   - Railway auto-detects Dockerfile
   - Get URL and set `PYTHON_BACKEND_URL` in Supabase
   - See example: https://railway.com/project/e27d711a-0387-4c88-9776-27fe3f84ebd3

2. **Render** (Free tier available)
   - Connect GitHub repo
   - Select Docker environment
   - Deploy and configure environment variable

3. **Docker Compose** (Self-hosted)
   ```bash
   cd backend
   docker-compose up -d
   ```

After deploying the Python backend:
1. Go to Supabase Dashboard → Edge Functions → extract-features → Settings
2. Add secret: `PYTHON_BACKEND_URL=https://your-backend-url.com`
3. Redeploy edge function

## Testing

### Backend Tests

```bash
cd backend
pytest tests/ -v
```

Test coverage includes:
- API endpoint tests
- Feature extraction tests
- Windowed analysis tests

### Frontend Tests

Frontend tests use the development server and manual testing procedures.

## Project Structure

```
gene-explorer-ai/
├── src/                      # Frontend React application
│   ├── components/           # Reusable UI components
│   ├── pages/                # Route pages
│   ├── hooks/                # Custom React hooks
│   ├── integrations/         # Supabase integration
│   └── types/                # TypeScript types
├── backend/                  # Python FastAPI backend
│   ├── main.py               # FastAPI application
│   ├── requirements.txt      # Python dependencies
│   ├── Dockerfile            # Docker configuration
│   └── tests/                # Backend tests
├── feature_engineering/      # Bioinformatics modules
│   ├── sequence.py           # Sequence analysis
│   ├── chemical.py           # Chemical properties
│   ├── cub.py                # Codon usage bias
│   └── disorder/             # Disorder prediction
├── supabase/                 # Supabase configuration
│   ├── functions/            # Edge functions
│   └── migrations/           # Database migrations
└── docs/                     # Documentation
    ├── ARCHITECTURE.md       # System architecture
    ├── PYTHON_BACKEND_INTEGRATION.md
    └── python-api-spec.md
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm run lint` and `cd backend && pytest`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

- 📖 [Read the documentation](docs/ARCHITECTURE.md)
- 🐛 [Report issues](https://github.com/itamar-menuhin/gene-explorer-ai/issues)
- 💬 [Ask questions](https://github.com/itamar-menuhin/gene-explorer-ai/discussions)
