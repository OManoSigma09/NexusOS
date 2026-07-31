#!/usr/bin/env bash
#
#           AetherOS Updater Script
#
#   Pulls the latest version from GitHub and rebuilds the containers.
#   Your data/ folder (admin account, config) is never touched.
#
#   Usage:
#       sudo bash update.sh
#
set -euo pipefail

INSTALL_DIR="/opt/aetheros"

readonly COLOUR_RESET='\e[0m'
readonly C_PURPLE='\e[38;5;135m'
readonly C_PINK='\e[38;5;213m'
readonly C_GREEN='\e[38;5;154m'
readonly C_RED='\e[91m'
readonly C_GREY='\e[90m'
readonly C_BOLD='\e[1m'
readonly LINE=" ${C_PURPLE}─────────────────────────────────────────────────────${COLOUR_RESET}"

Show() {
    case "$1" in
    0) echo -e "${C_GREY}[${COLOUR_RESET}${C_GREEN}  OK  ${COLOUR_RESET}${C_GREY}]${COLOUR_RESET} $2" ;;
    1) echo -e "${C_GREY}[${COLOUR_RESET}${C_RED}FAILED${COLOUR_RESET}${C_GREY}]${COLOUR_RESET} $2" >&2; exit 1 ;;
    2) echo -e "${C_GREY}[${COLOUR_RESET}${C_PURPLE} INFO ${COLOUR_RESET}${C_GREY}]${COLOUR_RESET} $2" ;;
    3) echo -e "${C_GREY}[${COLOUR_RESET}${C_PINK}NOTICE${COLOUR_RESET}${C_GREY}]${COLOUR_RESET} $2" ;;
    esac
}

if [[ "$(id -u)" -ne 0 ]]; then
    Show 1 "please run this script as root (or with sudo)."
fi

if [[ ! -d "$INSTALL_DIR/.git" ]]; then
    Show 1 "no AetherOS installation found at $INSTALL_DIR — run install.sh first."
fi

cd "$INSTALL_DIR"

echo -e "${LINE}"
echo -e " ${C_BOLD}AetherOS Updater${COLOUR_RESET}"
echo -e "${LINE}"

Show 2 "checking for updates..."
git fetch origin main --quiet

LOCAL_REV=$(git rev-parse HEAD)
REMOTE_REV=$(git rev-parse origin/main)

if [[ "$LOCAL_REV" == "$REMOTE_REV" ]]; then
    Show 0 "you're already on the latest version. Nothing to do."
    echo ""
    exit 0
fi

Show 3 "a new version is available — here's what changed:"
echo ""
git log --oneline --no-decorate "${LOCAL_REV}..${REMOTE_REV}" | sed 's/^/   /'
echo ""

read -rp " Update now? [Y/n] " confirm
if [[ "$confirm" =~ ^[Nn]$ ]]; then
    Show 2 "cancelled — staying on the current version."
    exit 0
fi

Show 2 "pulling the latest code..."
git pull origin main --quiet
Show 0 "code updated."

Show 2 "rebuilding and restarting AetherOS (data/ is left untouched)..."
docker compose up -d --build
Show 0 "AetherOS is back up on the latest version."

echo ""
echo -e "${LINE}"
echo -e " ${C_BOLD}Update complete!${COLOUR_RESET} ✅  ${C_GREY}($(git rev-parse --short HEAD))${COLOUR_RESET}"
echo -e "${LINE}"
echo ""
