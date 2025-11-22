# Transition2English Frontend

Frontend React para o sistema Transition2English - Multi-tenant metrics system.

## Instalação

```bash
npm install
```

## Configuração

Crie um arquivo `.env` na raiz do frontend:

```env
VITE_API_BASE=http://localhost:3001/api
```

## Desenvolvimento

```bash
npm run dev
```

O frontend estará disponível em `http://localhost:5173` (ou outra porta se 5173 estiver ocupada).

## Build

```bash
npm run build
```

Os arquivos de produção serão gerados na pasta `dist/`.

## Estrutura

- `src/components/` - Componentes React
- `src/contexts/` - Contextos React (Auth, etc.)
- `src/services/` - Serviços de API
- `src/utils/` - Utilitários

## Funcionalidades

- ✅ Autenticação (Login/Registro)
- ✅ Dashboard do usuário
- ✅ Dashboard administrativo
- ✅ Visualização de métricas
- ✅ Gerenciamento de assinaturas

## Requisitos

- Node.js 18+
- Backend rodando na porta 3001 (ou configurar `VITE_API_BASE`)

