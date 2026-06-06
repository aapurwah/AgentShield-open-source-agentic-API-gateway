# Contributing to AgentShield

Thank you for your interest in contributing to AgentShield. This project is designed to be easy to run locally, extend, and demo.

## How to contribute

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/my-improvement`.
3. Make your changes.
4. Run existing tests and ensure the project still builds.
5. Open a pull request describing your change.

## Code style

- JavaScript/React: follow idiomatic Next.js and Tailwind conventions.
- Go: use `gofmt` and keep middleware small and composable.
- Shell scripts: use `bash` with `set -euo pipefail` where possible.

## Running locally

Dashboard:

```bash
cd dashboard
npm install
npm run dev
```

Mock backend:

```bash
cd mock-backend
npm install
node server.js
```

Proxy:

```bash
cd proxy
go mod download
go test ./...
```

Full stack with Docker Compose:

```bash
cd agentshield
docker compose up --build
```

## Testing

- Use `./test.sh` from the repo root to run the integration smoke tests.
- Add targeted unit or integration tests for any new behavior.

## Reporting issues

- Open an issue for bugs, missing features, or documentation gaps.
- Include a short description, reproduction steps, and expected behavior.

## License

By contributing, you agree that your contributions will be licensed under the same terms as the project: MIT License.
