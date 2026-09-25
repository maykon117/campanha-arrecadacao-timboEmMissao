# Timbó em Missão — Sistema de arrecadação

Sistema web em React + TypeScript + Tailwind para gerenciar a arrecadação de alimentos da ação social.

## Agora com Supabase + Realtime

A versão atual substitui o `localStorage` por:

- **Supabase Postgres** para persistir campanhas, alimentos e arrecadações.
- **Supabase Realtime** para sincronizar alterações entre dispositivos.
- **Página pública** (`?view=public`) que acompanha os dados do banco.
- **Modo OBS** (`?view=obs`) que também acompanha o banco em tempo real.
- Histórico preservado no banco.
- Edição/exclusão sincronizadas.

### Fluxo

```text
Celular/PC administrativo
        ↓
   Supabase Postgres
        ↓
     Realtime
    ↙        ↘
Página pública   OBS
```

Se alguém registrar 20 pacotes de café no painel administrativo, o Supabase recebe a alteração e os outros dispositivos atualizam automaticamente.

## Configuração

### 1. Criar o projeto no Supabase

Crie um projeto em `supabase.com`.

### 2. Criar as tabelas e habilitar Realtime

Abra o **SQL Editor** do Supabase e execute:

```text
supabase/schema.sql
```

O script cria as tabelas, políticas, índices, campanha inicial e adiciona as tabelas à publicação `supabase_realtime`.

### 3. Configurar as variáveis

Crie `.env.local` na raiz:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLICA
```

Os valores ficam em **Supabase → Project Settings → API**.

### 4. Instalar e executar

```bash
npm install
npm run dev
```

## Importante sobre segurança

Esta etapa mantém o painel sem login para facilitar a operação durante o desenvolvimento e a ação social. Isso significa que, com o projeto publicado, quem tiver acesso à aplicação pode realizar alterações.

Antes de usar como sistema público definitivo, o próximo endurecimento recomendado é **Supabase Auth + RLS**, permitindo leitura pública, mas deixando criação/edição/exclusão apenas para usuários administrativos autenticados.

## URLs

Depois de publicado, mantendo o mesmo endereço:

```text
https://seu-site.com/?view=public
https://seu-site.com/?view=obs
```

O link `/ ?view=obs` pode ser adicionado no OBS como **Browser Source**.

## Estrutura principal

- `src/App.tsx` — interface, dashboard e modos público/OBS.
- `src/services/supabase.ts` — leitura, gravação e assinatura Realtime.
- `src/lib/supabase.ts` — cliente Supabase.
- `src/types/index.ts` — tipos do domínio.
- `supabase/schema.sql` — banco, RLS e Realtime.
