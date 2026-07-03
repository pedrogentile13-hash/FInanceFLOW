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

## 🛠️ Stack

- **HTML5 + CSS3 + Vanilla JS** — zero frameworks
- **Chart.js** (embutido em `assets/vendor/`, funciona offline)
- **LocalStorage** — todos os dados ficam no seu navegador
- **Fonte Inter** embutida (`assets/fonts/`)
- Modo claro/escuro, mobile-first, backup por exportação/importação de JSON

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
index.html … conquistas.html   páginas
assets/
  css/style.css                design system completo (tokens, dark mode, componentes)
  js/app.js                    núcleo: storage, layout, tema, modal, toast, XP/conquistas
  js/<página>.js               lógica de cada módulo
  vendor/chart.umd.min.js      Chart.js local
  fonts/                       Inter (woff2)
```
