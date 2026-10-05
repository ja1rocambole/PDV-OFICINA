# pdv-oficina

## Sobre o projeto

O OS Oficina nasceu com um objetivo simples: ajudar meu pai na organização da
oficina mecânica dele.

Este é um projeto que estou desenvolvendo junto com ele, acompanhando de perto
a rotina e as necessidades reais do negócio. A ideia é construir, sob demanda,
uma ferramenta que facilite o controle das informações da oficina e contribua
para uma organização mais prática, clara e eficiente.

Mais do que um exercício técnico, este projeto representa uma solução feita a
partir de problemas reais. Cada nova funcionalidade é pensada em conjunto,
considerando o que pode gerar valor para o dia a dia da oficina.

O sistema está em desenvolvimento e será evoluído conforme as necessidades do
negócio forem identificadas.

## Funcionalidades

Aplicativo desktop (pt-BR) com menu lateral:

- **Home**: Dashboard (estatísticas e últimas 5 OS)
- **Cadastros**: Clientes, Veículos, Funcionários
- **Funcionamento**: Ordem de Serviços e PDV (com baixa de estoque)

Os dados ficam em um arquivo SQLite (`oficina.sqlite`) na pasta `userData` do Electron.
Na primeira execução são inseridos dados de exemplo.

## Estrutura de pastas

```
src/
├── main/
│   ├── index.js            # processo principal (janela, banco, IPC)
│   ├── db/
│   │   ├── database.js     # conexão better-sqlite3, schema e seed
│   │   └── repositories/   # acesso a dados por entidade
│   └── ipc/index.js        # handlers ipcMain ('entidade:acao') -> { success, data | error }
├── preload/index.js        # expõe window.api via contextBridge
└── renderer/src/
    ├── App.jsx             # layout, menu lateral e rotas (HashRouter)
    ├── pages/              # Dashboard, Clientes, Veiculos, Funcionarios, OrdensServico, PDV
    ├── components/         # PageHeader, CrudPage, StatusTag
    └── utils/              # formatação (BRL, datas), validadores, helper de chamadas IPC
```

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```
