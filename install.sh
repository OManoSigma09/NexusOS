#!/usr/bin/env bash
#
#           AetherOS Installer Script v0.1.0
#   GitHub: https://github.com/SigmaDev21/AetherOS
#
#   This script installs AetherOS on your system.
#   Usage:
#       curl -fsSL https://raw.githubusercontent.com/SigmaDev21/AetherOS/main/install.sh | sudo bash
#
set -euo pipefail

REPO_URL="https://github.com/SigmaDev21/AetherOS.git"
INSTALL_DIR="/opt/aetheros"
PORT="3000"

###############################################################################
# Colors & UI helpers                                                        #
###############################################################################
readonly COLOUR_RESET='\e[0m'
readonly C_PURPLE='\e[38;5;135m'   # brand accent — lines, bullets, banner
readonly C_PINK='\e[38;5;213m'     # brand accent — emphasis / friendly nudges
readonly C_GREEN='\e[38;5;154m'    # success
readonly C_RED='\e[91m'            # failure
readonly C_GREY='\e[90m'           # secondary text
readonly C_BOLD='\e[1m'

readonly LINE=" ${C_PURPLE}─────────────────────────────────────────────────────${COLOUR_RESET}"

# Show <0:OK 1:FAILED 2:INFO 3:NOTICE> <message>
Show() {
    case "$1" in
    0) echo -e "${C_GREY}[${COLOUR_RESET}${C_GREEN}  OK  ${COLOUR_RESET}${C_GREY}]${COLOUR_RESET} $2" ;;
    1) echo -e "${C_GREY}[${COLOUR_RESET}${C_RED}FAILED${COLOUR_RESET}${C_GREY}]${COLOUR_RESET} $2" >&2; exit 1 ;;
    2) echo -e "${C_GREY}[${COLOUR_RESET}${C_PURPLE} INFO ${COLOUR_RESET}${C_GREY}]${COLOUR_RESET} $2" ;;
    3) echo -e "${C_GREY}[${COLOUR_RESET}${C_PINK}NOTICE${COLOUR_RESET}${C_GREY}]${COLOUR_RESET} $2" ;;
    esac
}

Banner() {
    echo -e "${C_PURPLE}${C_BOLD}"
    cat << "EOF"
     ___         __  __              ____  _____
    /   |  ___  / /_/ /_  ___  _____/ __ \/ ___/
   / /| | / _ \/ __/ __ \/ _ \/ ___/ / / /\__ \
  / ___ |/  __/ /_/ / / /  __/ /  / /_/ /___/ /
 /_/  |_|\___/\__/_/ /_/\___/_/   \____//____/
EOF
    echo -e "${COLOUR_RESET}${C_GREY}  --- control panel for your homelab ---${COLOUR_RESET}\n"
}

trap 'echo -e "${COLOUR_RESET}"; exit 1' INT

###############################################################################
# Pre-flight checks                                                          #
###############################################################################
Banner

if [[ "$(id -u)" -ne 0 ]]; then
    Show 1 "please run this script as root (or with sudo)."
fi

Print_System_Specs() {
    local os_name kernel arch cpu_model cpu_cores mem_total disk_free
    os_name=$( ([ -f /etc/os-release ] && . /etc/os-release && echo "$PRETTY_NAME") || uname -s)
    kernel=$(uname -r)
    arch=$(uname -m)
    cpu_model=$(grep -m1 "model name" /proc/cpuinfo 2>/dev/null | cut -d: -f2 | sed 's/^ *//')
    [[ -z "$cpu_model" ]] && cpu_model="unknown"
    cpu_cores=$(nproc 2>/dev/null || echo "unknown")
    mem_total=$(free -h 2>/dev/null | awk '/^Mem:/{print $2}')
    [[ -z "$mem_total" ]] && mem_total="unknown"
    disk_free=$(df -h / 2>/dev/null | awk 'NR==2{print $4 " free of " $2}')
    [[ -z "$disk_free" ]] && disk_free="unknown"

    echo -e "${LINE}"
    echo -e " ${C_BOLD}System specifications${COLOUR_RESET}"
    echo -e "${LINE}"
    echo -e " ${C_PURPLE}OS      ${COLOUR_RESET}: ${os_name}"
    echo -e " ${C_PURPLE}Kernel  ${COLOUR_RESET}: ${kernel}"
    echo -e " ${C_PURPLE}Arch    ${COLOUR_RESET}: ${arch}"
    echo -e " ${C_PURPLE}CPU     ${COLOUR_RESET}: ${cpu_model} (${cpu_cores} cores)"
    echo -e " ${C_PURPLE}Memory  ${COLOUR_RESET}: ${mem_total}"
    echo -e " ${C_PURPLE}Disk /  ${COLOUR_RESET}: ${disk_free}"
    echo -e "${LINE}\n"
}
Print_System_Specs

###############################################################################
# Package manager detection                                                  #
###############################################################################
PKG_MANAGER=""
if command -v apt-get &>/dev/null; then PKG_MANAGER="apt"
elif command -v dnf &>/dev/null; then PKG_MANAGER="dnf"
elif command -v yum &>/dev/null; then PKG_MANAGER="yum"
elif command -v pacman &>/dev/null; then PKG_MANAGER="pacman"
elif command -v apk &>/dev/null; then PKG_MANAGER="apk"
else
    Show 1 "unrecognized package manager (expected apt, dnf, yum, pacman, or apk)."
fi
Show 0 "detected distro package manager: ${C_BOLD}${PKG_MANAGER}${COLOUR_RESET}"

Pkg_Install() {
    local pkg="$1"
    case "$PKG_MANAGER" in
    apt)    apt-get install -y "$pkg" >/dev/null 2>&1 ;;
    dnf)    dnf install -y "$pkg" >/dev/null 2>&1 ;;
    yum)    yum install -y "$pkg" >/dev/null 2>&1 ;;
    pacman) pacman -S --noconfirm "$pkg" >/dev/null 2>&1 ;;
    apk)    apk add --no-cache "$pkg" >/dev/null 2>&1 ;;
    esac
}

Pkg_Update() {
    case "$PKG_MANAGER" in
    apt)    apt-get update -y >/dev/null 2>&1 ;;
    dnf)    dnf check-update -y >/dev/null 2>&1 || true ;;
    yum)    yum check-update -y >/dev/null 2>&1 || true ;;
    pacman) pacman -Sy --noconfirm >/dev/null 2>&1 ;;
    apk)    apk update >/dev/null 2>&1 ;;
    esac
}

Show 2 "updating package index..."
Pkg_Update
Show 0 "package index updated."

###############################################################################
# Friendly dependency check — "don't have it? I'll grab it now."             #
###############################################################################
# Check_Tool <command-to-look-for> <package-name-to-install> <friendly-label> <critical:true|false>
Check_Tool() {
    local cmd="$1" pkg="$2" label="$3" critical="$4"

    if command -v "$cmd" &>/dev/null; then
        Show 0 "${label} — already got it."
        return 0
    fi

    Show 3 "you don't have ${C_BOLD}${label}${COLOUR_RESET}${C_PINK}? no worries, grabbing it now...${COLOUR_RESET}"
    if Pkg_Install "$pkg"; then
        Show 0 "${label} installed."
        return 0
    fi

    if [[ "$critical" == "true" ]]; then
        Show 1 "couldn't install ${label} automatically — please install it manually and re-run this script."
    else
        Show 3 "couldn't find ${label} in this distro's repos — skipping (not critical)."
        return 1
    fi
}

# ca-certificates has no matching command to check for — just make sure it's there
Pkg_Install ca-certificates >/dev/null 2>&1 || true

echo -e "${LINE}"
echo -e " ${C_BOLD}Checking essential tools${COLOUR_RESET}"
echo -e "${LINE}"
Check_Tool curl  curl  "curl"  true
Check_Tool wget  wget  "wget"  true
Check_Tool git   git   "Git"   true
Check_Tool unzip unzip "unzip" true
echo -e "${LINE}\n"

###############################################################################
# Docker + Docker Compose v2                                                 #
###############################################################################
if ! command -v docker &>/dev/null; then
    Show 3 "you don't have ${C_BOLD}Docker${COLOUR_RESET}${C_PINK}? that's the big one — grabbing it now, might take a minute...${COLOUR_RESET}"
    curl -fsSL https://get.docker.com | sh >/dev/null 2>&1
    systemctl enable --now docker 2>/dev/null || service docker start 2>/dev/null || true
    Show 0 "Docker installed."
else
    Show 0 "Docker — already got it."
fi

# Docker Compose v2 ships as a CLI plugin (`docker compose`, no dash) rather
# than the old standalone `docker-compose` binary. get.docker.com usually
# installs it together with Docker, but not always — so we check for it
# explicitly and install it ourselves if it's missing.
Install_Docker_Compose_V2() {
    Show 3 "you don't have ${C_BOLD}Docker Compose v2${COLOUR_RESET}${C_PINK}? no worries, grabbing it now...${COLOUR_RESET}"

    # 1) try the distro's package manager first
    case "$PKG_MANAGER" in
    apt)    Pkg_Install docker-compose-v2 ;;
    dnf)    Pkg_Install docker-compose-v2 ;;
    yum)    Pkg_Install docker-compose-v2 ;;
    pacman) Pkg_Install docker-compose ;;
    apk)    Pkg_Install docker-cli-compose ;;
    esac

    if docker compose version &>/dev/null; then return 0; fi

    # 2) fall back to the official plugin binary from docker/compose releases
    Show 3 "package manager didn't have it — downloading the official plugin binary instead..."
    local arch plugin_dir
    case "$(uname -m)" in
    x86_64)  arch="x86_64" ;;
    aarch64) arch="aarch64" ;;
    armv7l)  arch="armv7" ;;
    *)       arch="$(uname -m)" ;;
    esac
    plugin_dir="/usr/local/lib/docker/cli-plugins"
    mkdir -p "$plugin_dir"
    curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-${arch}" \
        -o "${plugin_dir}/docker-compose"
    chmod +x "${plugin_dir}/docker-compose"
}

if ! docker compose version &>/dev/null; then
    Install_Docker_Compose_V2
    if ! docker compose version &>/dev/null; then
        Show 1 "Docker Compose v2 could not be installed automatically. Install it manually (https://docs.docker.com/compose/install/) and run this script again."
    fi
fi
Show 0 "Docker Compose: $(docker compose version --short 2>/dev/null || echo 'v2')"

###############################################################################
# Nice-to-have CLI tools                                                     #
###############################################################################
echo ""
echo -e "${LINE}"
echo -e " ${C_BOLD}Nice-to-have extras${COLOUR_RESET}"
echo -e "${LINE}"
Check_Tool neofetch neofetch "neofetch" false
Check_Tool btop     btop     "btop"     false
echo -e "${LINE}\n"

###############################################################################
# Fetch & run AetherOS                                                       #
###############################################################################
if [[ -d "$INSTALL_DIR/.git" ]]; then
    Show 2 "existing installation found at $INSTALL_DIR, updating..."
    git -C "$INSTALL_DIR" pull >/dev/null
    Show 0 "repository updated."
else
    Show 2 "cloning AetherOS into $INSTALL_DIR..."
    git clone --depth 1 "$REPO_URL" "$INSTALL_DIR" >/dev/null
    Show 0 "repository cloned."
fi

cd "$INSTALL_DIR"
mkdir -p data

Show 2 "building and starting AetherOS (this can take a few minutes on the first run)..."
docker compose up -d --build
Show 0 "AetherOS containers are up."

###############################################################################
# Welcome banner                                                             #
###############################################################################
IP_ADDR=$(hostname -I 2>/dev/null | awk '{print $1}')
[[ -z "$IP_ADDR" ]] && IP_ADDR="localhost"

echo ""
echo -e "${LINE}"
echo -e " ${C_BOLD}AetherOS${COLOUR_RESET} is up and running ${C_PURPLE}:${COLOUR_RESET}"
echo -e "${LINE}"
echo -e " ${C_PURPLE}➜${COLOUR_RESET} http://${IP_ADDR}:${PORT}"
echo -e "${LINE}"
echo ""
echo -e " ${C_GREY}First run: complete the setup wizard to create your admin account.${COLOUR_RESET}"
echo -e " ${C_GREY}Uninstall : sudo bash ${INSTALL_DIR}/uninstall.sh${COLOUR_RESET}"
echo ""
command -v neofetch &>/dev/null && neofetch
echo ""
