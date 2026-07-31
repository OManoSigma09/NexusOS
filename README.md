# AetherOS — your homelab, unified

<p align="center">
    <picture>
        <source media="(prefers-color-scheme: dark)" srcset="images/aetherosbanner.png">
        <source media="(prefers-color-scheme: light)" srcset="images/aetherosbanner.png">
        <img alt="AetherOS" src="images/aetherosbanner.png">
    </picture>
    <br/>
    <i>Containers, files, monitoring, and an app store — all in one panel, with a liquid glass interface.</i>
    <br/>
    <br/>
    <a href="https://github.com/SigmaDev21/AetherOS/releases" target="_blank">
        <img alt="AetherOS Version" src="https://img.shields.io/github/v/release/SigmaDev21/AetherOS?color=8B5CF6&style=flat-square&label=AetherOS" />
    </a>
    <a href="https://github.com/SigmaDev21/AetherOS/blob/main/LICENSE" target="_blank">
        <img alt="AetherOS License" src="https://img.shields.io/github/license/SigmaDev21/AetherOS?color=8B5CF6&style=flat-square&label=License" />
    </a>
    <a href="https://github.com/SigmaDev21/AetherOS/pulls" target="_blank">
        <img alt="AetherOS Pull Requests" src="https://img.shields.io/github/issues-pr/SigmaDev21/AetherOS?color=8B5CF6&style=flat-square&label=PRs" />
    </a>
    <a href="https://github.com/SigmaDev21/AetherOS/issues" target="_blank">
        <img alt="AetherOS Issues" src="https://img.shields.io/github/issues/SigmaDev21/AetherOS?color=8B5CF6&style=flat-square&label=Issues" />
    </a>
    <a href="https://github.com/SigmaDev21/AetherOS/stargazers" target="_blank">
        <img alt="AetherOS Stargazers" src="https://img.shields.io/github/stars/SigmaDev21/AetherOS?color=8B5CF6&style=flat-square&label=Stars" />
    </a>
    <br/>
    <br/>
    <a href="https://github.com/SigmaDev21/AetherOS" target="_blank">GitHub</a>
    <br/>
    <br/>
    <kbd>
      <img alt="AetherOS Screenshot" src="images/screenshot.png">
    </kbd>
</p>

> If you like the project, drop a **⭐** — it helps a lot.

## Why a dashboard of your own?

The idea behind AetherOS is simple: a homelab shouldn't need ten open tabs (Portainer for containers, something else for files, another thing for metrics, another for installing apps). AetherOS brings all of that into a single interface, running straight on your own machine via Docker, with no dependency on third-party cloud for anything.

## Features

- Liquid glass interface, with light and dark themes
  - Customizable wallpaper, right from the interface
- Docker container management
  - Start, stop, restart, and view logs, right from the panel
- Real-time system widgets
  - CPU, memory, disk, network, per-volume storage, and overall host status
- Aether Store — one-click app installs
  - Built-in catalog + custom apps (bring your own Docker image) + external links
- First-run setup wizard
  - No hand-editing config files — just fill out the form

## Getting Started

### Compatibility

- Any Linux distro with **Docker** and **Docker Compose v2** (the installer handles both if they're missing)
- amd64, arm64, and armv7 architectures

> There's no official per-distro test matrix yet — if you run it on something unusual and it works (or doesn't), open an issue and let us know.

### Quick install

On a fresh Linux machine, run:

```sh
curl -fsSL https://raw.githubusercontent.com/SigmaDev21/AetherOS/main/install.sh | sudo bash
```

The installer detects your distro, installs Docker/Docker Compose/git/curl if anything's missing, downloads the project, and brings the containers up. At the end it prints the access address — something like `http://<machine-ip>`, no port needed.

### Updating

```sh
cd /opt/aetheros
sudo bash update.sh
```

Checks GitHub for the latest version, shows what changed, and rebuilds the containers. Your `data/` folder (admin account, config) is never touched.

### Uninstalling

```sh
cd /opt/aetheros
sudo bash uninstall.sh            # interactive, keeps the data/ folder
sudo bash uninstall.sh --purge    # non-interactive, deletes EVERYTHING (containers, image, and data/)
```

## Running manually

```sh
git clone https://github.com/SigmaDev21/AetherOS.git
cd AetherOS
docker compose up -d --build
```

## Local development (without Docker)

```sh
cd backend
npm install
npm run dev
```

> Outside a container, access to `/var/run/docker.sock` and host metrics depends on your OS — it works out of the box on Linux; on macOS/Windows use Docker Desktop, which exposes the socket automatically.

## Project structure

```
AetherOS/
├── backend/            # Node.js + Express API
│   ├── routes/          # auth, containers, system, apps
│   ├── lib/              # docker.js, system.js, config.js, authMiddleware.js
│   ├── data/              # config.json and app catalog (persisted via volume)
│   └── server.js
├── frontend/            # interface (plain HTML/CSS/JS)
├── docker-compose.yml
├── install.sh
├── update.sh
└── uninstall.sh
```

## First run

1. Access the machine's IP.
2. The setup wizard will ask for a host name, admin account, and theme.
3. After that, use that account to log in normally.

## Roadmap

- [ ] Wire the frontend to the real API routes (it still uses sample data today)
- [ ] File manager with real upload/download
- [x] Sync the Aether Store catalog with public app catalogs
- [ ] One-click install for catalog apps (apply each template's docker-compose)

## Credits

The Aether Store catalog is synced from a public, third-party app catalog licensed under Apache-2.0. Credit to the original maintainers — see `backend/lib/casaosStore.js` for the technical details of the integration.

## License

MIT — see [LICENSE](LICENSE).
