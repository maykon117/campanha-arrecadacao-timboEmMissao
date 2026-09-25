# Timbó em Missão — Sistema de arrecadação

Sistema web em React + TypeScript + Tailwind para gerenciar a arrecadação de alimentos da ação social.

## Supabase + Realtime

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

## Estrutura principal

- `src/App.tsx` — interface, dashboard e modos público/OBS.
- `src/services/supabase.ts` — leitura, gravação e assinatura Realtime.
- `src/lib/supabase.ts` — cliente Supabase.
- `src/types/index.ts` — tipos do domínio.
- `supabase/schema.sql` — banco, RLS e Realtime.
