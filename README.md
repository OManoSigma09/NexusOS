# AetherOS

Painel de controle self-hosted para homelab — containers Docker, arquivos, monitoramento e app store, com interface liquid glass.

## Instalação rápida (uma máquina Linux com Docker)

```bash
curl -fsSL https://raw.githubusercontent.com/SigmaDev21/AetherOS/main/install.sh | sudo bash
```

Depois é só acessar `http://<ip-da-maquina>:3000`.

## Rodando manualmente

```bash
git clone https://github.com/SigmaDev21/AetherOS.git
cd aetheros
docker compose up -d --build
```

## Desenvolvimento local (sem Docker)

```bash
cd backend
npm install
npm run dev
```

> Fora de um container, o acesso ao `/var/run/docker.sock` e às métricas do host
> depende do seu sistema operacional — em Linux funciona direto; em macOS/Windows
> use o Docker Desktop, que expõe o socket automaticamente.

## Estrutura

```
aetheros/
├── backend/          # API Node.js + Express
│   ├── routes/        # auth, containers, system, apps
│   ├── lib/           # docker.js, system.js, config.js, authMiddleware.js
│   ├── data/           # config.json e catálogo de apps (persistido via volume)
│   └── server.js
├── frontend/          # interface (HTML/CSS/JS puro)
├── docker-compose.yml
└── install.sh
```

## Primeira execução

1. Acesse o IP da máquina na porta 3000.
2. O assistente de configuração inicial vai pedir nome do host, conta de administrador e tema.
3. Depois disso, use essa conta pra fazer login normalmente.

## Desinstalando

```bash
cd /opt/aetheros
sudo bash uninstall.sh            # interativo, mantém a pasta data/
sudo bash uninstall.sh --yes      # sem perguntas, mantém a pasta data/
sudo bash uninstall.sh --purge    # sem perguntas, apaga TUDO (containers, imagem e data/)
```

Docker, neofetch e btop **não** são removidos automaticamente (são ferramentas de uso geral do sistema, não exclusivas do AetherOS).

## Aether Store

A App Store do AetherOS ("Aether Store") combina dois catálogos:

- `backend/data/apps-catalog.json` — catálogo próprio, editado à mão
- Catálogo público do [CasaOS AppStore](https://github.com/IceWhaleTech/CasaOS-AppStore) (Apache-2.0, créditos à IceWhaleTech) — sincronizado automaticamente pelo backend a cada 24h

A sincronização baixa o repositório do CasaOS como `.zip` uma vez (evita o rate limit da API do GitHub), extrai cada `Apps/<nome>/docker-compose.yml` e lê os metadados do bloco `x-casaos:` (ícone, categoria, descrição). O resultado fica em cache em `data/casaos-catalog-cache.json`.

Endpoint manual pra forçar a sincronização: `POST /api/apps/refresh-casaos-store`.

> Instalação de apps com um clique (aplicar o `docker-compose.yml` de cada app via Docker) ainda não está implementada — só o catálogo/listagem por enquanto.

## Roadmap

- [ ] Conectar o frontend às rotas reais da API (hoje ele ainda usa dados de exemplo)
- [ ] Gerenciador de arquivos com upload/download real
- [x] Sincronizar o catálogo da Aether Store com o CasaOS AppStore
- [ ] Instalação de apps com um clique (aplicar o docker-compose de cada template)
