# Contributing to Agent-eBPF 🛡️

Thank you for your interest in contributing to **Agent-eBPF**! We are building the next generation of autonomous Linux kernel security for AI agents and swarms.

## 🤝 Code of Conduct

We are committed to providing a welcoming, inclusive, and professional environment for everyone. Please be respectful and courteous in all interactions.

## 🛠️ How to Contribute

### 1. Reporting Bugs
- Search existing GitHub Issues to see if the issue has already been reported.
- If not, create a new Issue using the **Bug Report** template.
- Include OS version, Linux Kernel version (`uname -r`), Python version, and steps to reproduce.

### 2. Suggesting Features
- Open a GitHub Issue using the **Feature Request** template.
- Clearly describe the use case and why it benefits AI agent security or kernel performance.

### 3. Submitting Pull Requests (PRs)
1. Fork the repository and create your branch from `main`:
   ```bash
   git checkout -b feature/my-cool-feature
   ```
2. Make your changes and add tests under `tests/`.
3. Ensure all tests pass:
   ```bash
   pytest
   ```
4. Commit your changes with a clear commit message:
   ```bash
   git commit -m "feat(kernel): add support for MySQL protocol parsing in sock_filter"
   ```
5. Push to your fork and submit a Pull Request targeting `main`.

## 🧪 Testing Guidelines
- Write unit tests for new Python utilities in `tests/`.
- Ensure eBPF bytecode compilations pass with `clang -O2 -target bpf`.
- Test MCP SSE tools against the FastAPI mock server (`mcp_server.py`).

## 📄 License
By contributing to Agent-eBPF, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
