#!/usr/bin/env bash
#
#           AetherOS Uninstaller Script
#
#   Usage:
#       sudo bash uninstall.sh              # interactive, keeps your data/ folder
#       sudo bash uninstall.sh --yes        # non-interactive, keeps your data/ folder
#       sudo bash uninstall.sh --purge      # non-interactive, deletes EVERYTHING including data/
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

AUTO_YES=false
PURGE=false
for arg in "$@"; do
    case "$arg" in
    --yes|-y) AUTO_YES=true ;;
    --purge)  AUTO_YES=true; PURGE=true ;;
    esac
done

if [[ "$(id -u)" -ne 0 ]]; then
    Show 1 "please run this script as root (or with sudo)."
fi

if [[ ! -d "$INSTALL_DIR" ]]; then
    Show 1 "no AetherOS installation found at $INSTALL_DIR — nothing to do."
fi

echo -e "${LINE}"
echo -e " ${C_BOLD}AetherOS Uninstaller${COLOUR_RESET}"
echo -e "${LINE}"
echo -e " This will stop and remove the AetherOS container and its Docker image."
if [[ "$PURGE" == true ]]; then
    echo -e " ${C_RED}--purge was passed: your data/ folder (config, admin account,${COLOUR_RESET}"
    echo -e " ${C_RED}app catalog cache) will also be permanently deleted.${COLOUR_RESET}"
fi
echo -e "${LINE}"

if [[ "$AUTO_YES" == false ]]; then
    read -rp " Continue? [y/N] " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        Show 2 "cancelled — nothing was changed."
        exit 0
    fi
fi

cd "$INSTALL_DIR"

Show 2 "stopping and removing containers..."
docker compose down --remove-orphans >/dev/null 2>&1 || true
Show 0 "containers stopped and removed."

Show 2 "removing the built AetherOS Docker image..."
docker image rm aetheros:latest >/dev/null 2>&1 || true
Show 0 "image removed."

if [[ "$PURGE" == true ]]; then
    Show 2 "deleting data/ (config, admin account, app catalog cache)..."
    rm -rf "$INSTALL_DIR/data"
    Show 2 "deleting the install directory itself ($INSTALL_DIR)..."
    cd /
    rm -rf "$INSTALL_DIR"
    Show 0 "everything removed."
else
    Show 3 "keeping $INSTALL_DIR/data — reinstalling later will skip the setup wizard."
    Show 3 "keeping the cloned repo at $INSTALL_DIR (run install.sh again to reuse it, or delete it manually)."
fi

echo ""
echo -e "${LINE}"
echo -e " ${C_BOLD}AetherOS has been uninstalled.${COLOUR_RESET} ✅"
echo -e "${LINE}"
if [[ "$PURGE" == false ]]; then
    echo -e " ${C_GREY}Docker, neofetch, and btop were left installed — they're general-purpose${COLOUR_RESET}"
    echo -e " ${C_GREY}tools, not removed automatically.${COLOUR_RESET}"
    echo -e " ${C_GREY}To fully wipe everything including your data: sudo bash uninstall.sh --purge${COLOUR_RESET}"
fi
echo ""
