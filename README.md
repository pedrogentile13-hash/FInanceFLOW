# FinanceFlow 💙

> **Transformando dinheiro em decisões inteligentes.**

Sistema operacional completo para gestão financeira pessoal, metas, sonhos, projetos e inteligência financeira — construído com HTML5, CSS3 e JavaScript puro (sem frameworks), com visual inspirado em Stripe, Linear, Notion e Monarch Money.

## ✨ Módulos

| Página | O que faz |
|---|---|
| `index.html` | Landing page com hero, recursos, preview do dashboard e CTA |
| `dashboard.html` | Dashboard executivo: patrimônio, saldo, fluxo de caixa, economia, gráficos, resumo da IA |
| `entradas.html` / `saidas.html` | CRUD completo de movimentações com categorias, formas de pagamento, filtros e gráfico por categoria |
| `metas.html` | Metas com prazo, prioridade, progresso, aportes e status automático |
| `sonhos.html` | Painel visual de sonhos com previsão de realização |
| `investimentos.html` | Carteira com rentabilidade simulada (juros compostos) e projeção de 24 meses |
| `projetos.html` | Cada projeto é um mini negócio: receita, custos, lucro, MRR, ARR, runway, ticket médio |
| `estatisticas.html` | Recordes históricos, médias, comparativos e **heatmap de gastos estilo GitHub** |
| `simulador.html` | Simulador de poupança, calculadora de compra e 9 calculadoras de negócio (ROI, CAC, LTV, Break Even…) |
| `ia-financeira.html` | Motor de insights por regras (100% local), detector de gastos inúteis, resumos e chat |
| `conquistas.html` | Gamificação: XP, níveis, missões e 20 conquistas |
| `configuracoes.html` | Central completa: tema, cor principal, idioma/moeda/data, CRUD de categorias, backup, reset e conexão com a nuvem |
| `index.html` | Landing page com login e criação de conta integrados (modal) |

## 🛠️ Stack

- **HTML5 + CSS3 + Vanilla JS** — zero frameworks, zero build
- **PWA instalável** — prompt "Instalar app" no navegador, funciona offline e
  atualiza em tempo real via service worker
- **Chart.js** e **fonte Inter** embutidos (funciona 100% offline)
- **LocalStorage** por padrão; **Supabase** opcional para nuvem
- Visualização por período (mês, 3 meses, ano ou tudo) no dashboard e estatísticas
- Modo claro/escuro, 6 cores de destaque, ícones SVG profissionais, mobile-first

## ☁️ Nuvem e autenticação (opcional)

O app funciona 100% local por padrão. Para login com Google, recuperação de senha
por e-mail e sincronização automática entre dispositivos:

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. Rode `supabase/schema.sql` no SQL Editor (cria a tabela com Row Level Security).
3. Habilite os provedores Email e Google em Authentication.
4. Cole a URL e a anon key em **Configurações → Sincronização em nuvem**.

Sem Supabase, o login local (offline) continua disponível: contas com senha
protegida por hash, código de recuperação e dados isolados por usuário.

> **Por que Supabase e não Firebase?** Postgres relacional (dados financeiros são
> relacionais), Row Level Security declarada no banco, auth com Google incluída,
> SDK utilizável sem build via bundle local, realtime nativo e open source sem
> lock-in. Justificativa completa em `docs/PLANO-V1.md`.

## 🚀 Como rodar

Não precisa de build nem servidor obrigatório — é estático:

```bash
# opção 1: abrir direto
open index.html

# opção 2: servidor local
python3 -m http.server 8000
# → http://localhost:8000
```

Na primeira visita o sistema carrega dados de demonstração; use os botões **Exportar/Importar backup** na sidebar para guardar seus dados.

## 📁 Estrutura

```
index.html                     landing + autenticação (modal)
pages/                         todas as páginas do app
manifest.webmanifest, sw.js    PWA (instalação + offline + atualização)
assets/
  css/style.css                design system (tokens, dark mode, componentes, animações)
  js/core/
    utils.js                   formatação (moeda/data/idioma), helpers
    store.js                   estado, persistência por perfil, categorias, backup
    gamification.js            XP, níveis, conquistas
    ui.js                      tema, cor principal, sidebar, topbar, toast, modal
    auth.js                    contas locais + provedor Supabase
    sync.js                    sincronização em nuvem (Supabase)
  js/app.js                    compositor: inicialização de página
  js/<página>.js               lógica de cada módulo
  js/core/icons.js             biblioteca de ícones SVG
  vendor/                      Chart.js e Supabase SDK locais
  fonts/                       Inter (woff2)
  icons/                       ícones do PWA
supabase/schema.sql            tabela + RLS + realtime para a nuvem
docs/PLANO-V1.md               plano de implementação da v1.0
```
