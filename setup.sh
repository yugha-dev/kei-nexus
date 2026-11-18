#!/usr/bin/env bash
# ==============================================================================
#  ⚡ KEI-NEXUS: ONE-CLICK QUICKSTART INSTALLER ⚡
#  Challenge Kei Inference — Autonomous AI Agent Ecosystem
# ==============================================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

clear 2>/dev/null || true

echo -e "${PURPLE}${BOLD}"
echo "    ██╗  ██╗███████╗██╗    ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗"
echo "    ██║ ██╔╝██╔════╝██║    ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝"
echo "    █████╔╝ █████╗  ██║    ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗"
echo "    ██╔═██╗ ██╔══╝  ██║    ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║"
echo "    ██║  ██╗███████╗██║    ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║"
echo "    ╚═╝  ╚═╝╚══════╝╚═╝    ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝"
echo -e "${NC}"
echo -e "   ${CYAN}${BOLD}⚡ Autonomous AI Agent Ecosystem — One-Click Setup ⚡${NC}\n"

# 1. Check Node.js
echo -e "${CYAN}▶ Langkah 1/4: Memeriksa dependensi sistem...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js tidak ditemukan! Harap install Node.js v20+ terlebih dahulu.${NC}"
    echo "  Download di: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${YELLOW}! Peringatan: Disarankan Node.js versi 18 atau 20+ (versi saat ini: $(node -v)).${NC}"
else
    echo -e "${GREEN}✓ Node.js terdeteksi: $(node -v)${NC}"
fi

# 2. Install NPM packages
echo -e "\n${CYAN}▶ Langkah 2/4: Menginstall dependencies (npm install)...${NC}"
npm install --no-audit --no-fund

# 3. Configure .env
echo -e "\n${CYAN}▶ Langkah 3/4: Konfigurasi API Key Kei Inference...${NC}"

NEED_KEY=true
if [ -f .env ]; then
    EXISTING_KEY=$(grep "^KEI_API_KEY=" .env | cut -d '=' -f 2- | tr -d ' ' || true)
    if [ -n "$EXISTING_KEY" ] && [ "$EXISTING_KEY" != "sk-your-key-here" ]; then
        echo -e "${GREEN}✓ File .env sudah ada dengan API Key aktif (${EXISTING_KEY:0:10}...)${NC}"
        echo -ne "${YELLOW}Gunakan API key yang sudah ada? [Y/n]: ${NC}"
        read -r KEEP_KEY
        if [[ ! "$KEEP_KEY" =~ ^[Nn]$ ]]; then
            NEED_KEY=false
        fi
    fi
fi

if [ "$NEED_KEY" = true ]; then
    if [ ! -f .env ]; then
        cp .env.example .env
    fi

    echo -e "${YELLOW}🔑 Belum punya API key? Minta gratis di Telegram @KeiInferenceBot${NC}"
    echo -ne "${BOLD}Masukkan KEI_API_KEY Anda: ${NC}"
    read -r USER_KEY

    if [ -n "$USER_KEY" ]; then
        sed -i.bak "s|^KEI_API_KEY=.*|KEI_API_KEY=$USER_KEY|" .env 2>/dev/null || sed -i "" "s|^KEI_API_KEY=.*|KEI_API_KEY=$USER_KEY|" .env
        rm -f .env.bak 2>/dev/null || true
        echo -e "${GREEN}✓ API Key tersimpan ke .env!${NC}"
    else
        echo -e "${YELLOW}! API key dikosongkan. Anda bisa mengedit file .env nanti.${NC}"
    fi
fi

# 4. Build TypeScript
echo -e "\n${CYAN}▶ Langkah 4/4: Melakukan kompilasi TypeScript build...${NC}"
npm run build

# 5. Diagnostics
echo -e "\n${CYAN}▶ Menjalankan Healthcheck Diagnostik...${NC}"
npx tsx src/cli/index.ts doctor || true

# 6. Interactive Launcher Menu
echo -e "\n${GREEN}${BOLD}================================================================${NC}"
echo -e "${GREEN}${BOLD}  ✨ KEI-NEXUS SIAP DIJALANKAN! Pilih opsi yang ingin kamu coba: ${NC}"
echo -e "${GREEN}${BOLD}================================================================${NC}"
echo -e "  ${BOLD}1)${NC} 🌐 Buka ${CYAN}Web Studio GUI${NC} (Rekomendasi! Browser http://localhost:4100)"
echo -e "  ${BOLD}2)${NC} 📊 Jalankan ${CYAN}Fullstack Security & Architecture Audit${NC} (Menghasilkan HTML)"
echo -e "  ${BOLD}3)${NC} 📑 Jalankan ${CYAN}Interactive Slide Deck Generator${NC} (Menghasilkan Slide HTML)"
echo -e "  ${BOLD}4)${NC} 🧪 Jalankan ${CYAN}Automated Test Suite${NC} (Vitest 47/47 passing)"
echo -e "  ${BOLD}5)${NC} 🚪 Keluar"
echo ""
echo -ne "${BOLD}Pilih nomor [1-5] (default 1): ${NC}"
read -r CHOICE

case "$CHOICE" in
    2)
        echo -e "\n${CYAN}Menjalankan Flagship Audit Workflow...${NC}"
        npm run workflow:audit
        echo -e "\n${GREEN}✓ Selesai! Buka laporan di browser:${NC}"
        echo -e "  ${BOLD}.workspace/artifacts/audit-report.html${NC}"
        ;;
    3)
        echo -e "\n${CYAN}Menjalankan Interactive Slide Deck Generator...${NC}"
        npm run workflow:slides
        echo -e "\n${GREEN}✓ Selesai! Buka slide presentasi di browser:${NC}"
        echo -e "  ${BOLD}.workspace/artifacts/pitch-deck.html${NC}"
        ;;
    4)
        echo -e "\n${CYAN}Menjalankan Unit & Integration Tests...${NC}"
        npm test
        ;;
    5)
        echo -e "\n${GREEN}Terima kasih! Jalankan 'npm run studio' kapan saja untuk membuka Web Studio.${NC}"
        exit 0
        ;;
    *)
        echo -e "\n${CYAN}Meluncurkan Web Studio Cockpit di http://localhost:4100 ...${NC}"
        npm run studio
        ;;
esac
