# Documentacao Tecnica da API Lovable

**Workflow:** API Lovable
**ID:** `8lyPxa18MOuFx8k6`
**Status:** Ativo
**Base URL:** `https://clickcannabis.app.n8n.cloud`
**Ultima Atualizacao:** 15/01/2026

---

## Sumario dos Endpoints

| # | Endpoint | Metodo | Descricao |
|---|----------|--------|-----------|
| 1 | `/webhook/listar-medicos` | GET | Lista todos os medicos ativos |
| 2 | `/webhook/metricas-medicos-para-score` | GET | Metricas de performance dos medicos |
| 3 | `/webhook/ver-calendario-do-medico` | GET | Calendario/horarios de um medico |
| 4 | `/webhook/demanda-de-agendamento` | GET | Previsao de demanda (14 dias) |
| 5 | `/webhook/validar-consultas-agendadas` | GET | Consultas agendadas de um medico |
| 6 | `/webhook/atualizar-hora-medico` | POST | Atualiza horarios de um medico |
| 7 | `/webhook/atualizar-prioridade-medico` | POST | Atualiza prioridade de medicos |

---

## 1. Listar Medicos

Lista todos os medicos cadastrados na plataforma (excluindo testes).

### Request

```http
GET https://clickcannabis.app.n8n.cloud/webhook/listar-medicos
```

**Parametros:** Nenhum

### Response

```json
[
  {
    "id": 123,
    "user_id": 456,
    "name": "Dr. Joao Silva",
    "email": "joao.silva@email.com",
    "phone": "11999999999",
    "crm": "CRM/SP 123456"
  }
]
```

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | integer | ID do medico na tabela `doctors` |
| `user_id` | integer | ID do usuario na tabela `users` |
| `name` | string | Nome completo do medico |
| `email` | string | Email do medico |
| `phone` | string | Telefone do medico |
| `crm` | string | Registro no CRM |

---

## 2. Metricas de Medicos para Score

Retorna metricas de performance dos medicos para calculo de score/ranking.

### Request

```http
GET https://clickcannabis.app.n8n.cloud/webhook/metricas-medicos-para-score?weeks=8
```

**Query Parameters:**

| Parametro | Tipo | Obrigatorio | Default | Descricao |
|-----------|------|-------------|---------|-----------|
| `weeks` | integer | Nao | 8 | Periodo em semanas para analise |

### Response

```json
[
  {
    "doctor_id": 123,
    "total_consultas": 150,
    "total_vendas": 120,
    "taxa_conversao": 0.80,
    "ticket_medio": 1250.00,
    "valor_total": 150000.00
  }
]
```

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `doctor_id` | integer | ID do medico |
| `total_consultas` | integer | Total de consultas realizadas no periodo |
| `total_vendas` | integer | Total de orcamentos confirmados |
| `taxa_conversao` | float | Vendas / Consultas (0-1) |
| `ticket_medio` | float | Valor total / Total de vendas |
| `valor_total` | float | Faturamento total gerado |

---

## 3. Ver Calendario do Medico

Retorna os horarios cadastrados de um medico especifico, expandidos por dia da semana.

### Request

```http
GET https://clickcannabis.app.n8n.cloud/webhook/ver-calendario-do-medico?doctor_id=123
```

**Query Parameters:**

| Parametro | Tipo | Obrigatorio | Descricao |
|-----------|------|-------------|-----------|
| `doctor_id` | integer | Sim | ID do medico |

### Response

```json
[
  {
    "doctor_id": 123,
    "doctor_name": "Dr. Joao Silva",
    "crm": "CRM/SP 123456",
    "dia_semana": "SEG",
    "dia_numero": 1,
    "horario": "08:00-12:00",
    "hora_inicio": "08:00",
    "hora_fim": "12:00"
  },
  {
    "doctor_id": 123,
    "doctor_name": "Dr. Joao Silva",
    "crm": "CRM/SP 123456",
    "dia_semana": "SEG",
    "dia_numero": 1,
    "horario": "14:00-18:00",
    "hora_inicio": "14:00",
    "hora_fim": "18:00"
  }
]
```

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `doctor_id` | integer | ID do medico |
| `doctor_name` | string | Nome do medico |
| `crm` | string | CRM do medico |
| `dia_semana` | string | Codigo do dia (DOM, SEG, TER, QUA, QUI, SEX, SAB) |
| `dia_numero` | integer | Numero do dia (0=DOM, 1=SEG, ..., 6=SAB) |
| `horario` | string | Bloco completo de horario (ex: "08:00-12:00") |
| `hora_inicio` | string | Hora de inicio (HH:MM) |
| `hora_fim` | string | Hora de fim (HH:MM) |

---

## 4. Demanda de Agendamento

Retorna previsao de demanda e capacidade para os proximos 14 dias, incluindo slots disponiveis, ocupacao e historico.

### Request

```http
GET https://clickcannabis.app.n8n.cloud/webhook/demanda-de-agendamento
```

**Parametros:** Nenhum

### Response

```json
{
  "previsao": {
    "atualizado_em": "2026-01-15T12:00:00.000Z",
    "metodologia": {
      "periodo_historico": "28 dias",
      "filtro_outliers": "Dias com volume < 50% do maximo sao excluidos automaticamente",
      "ponderacao": "Peso de 1.0 (mais antigo) ate 1.75 (mais recente)"
    },
    "semana_atual": {
      "periodo": {
        "inicio": "2026-01-15",
        "fim": "2026-01-19"
      },
      "totais": {
        "slots_disponiveis": 2835,
        "demanda_prevista": 2055,
        "agendadas": 1920,
        "slots_livres": 915,
        "ocupacao_pct": 67.7
      },
      "dias": [
        {
          "data": "2026-01-15",
          "dia": "QUA",
          "slots_totais": 567,
          "medicos": 12,
          "demanda_prevista": 411,
          "hist_min": 320,
          "hist_max": 450,
          "agendadas": 385,
          "slots_livres": 182,
          "ocupacao_pct": 67.9,
          "periodos": {
            "manha": 145,
            "tarde": 180,
            "noite": 60
          }
        }
      ]
    },
    "proxima_semana": {
      "periodo": { "inicio": "2026-01-20", "fim": "2026-01-28" },
      "totais": {},
      "dias": []
    }
  }
}
```

**Estrutura do Response:**

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `atualizado_em` | datetime | Timestamp da consulta |
| `metodologia` | object | Explicacao da metodologia usada |
| `semana_atual` / `proxima_semana` | object | Dados agregados por semana |

**Estrutura de cada Semana:**

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `periodo.inicio` | date | Data de inicio da semana |
| `periodo.fim` | date | Data de fim da semana |
| `totais.slots_disponiveis` | integer | Total de slots na semana |
| `totais.demanda_prevista` | integer | Demanda prevista baseada no historico |
| `totais.agendadas` | integer | Consultas ja agendadas |
| `totais.slots_livres` | integer | Slots ainda disponiveis |
| `totais.ocupacao_pct` | float | Percentual de ocupacao |

**Estrutura de cada Dia:**

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `data` | date | Data do dia |
| `dia` | string | Codigo do dia da semana |
| `slots_totais` | integer | Capacidade total de slots (20 min cada) |
| `medicos` | integer | Quantidade de medicos ativos no dia |
| `demanda_prevista` | integer | Previsao ponderada de demanda |
| `hist_min` | integer | Minimo historico (28 dias) |
| `hist_max` | integer | Maximo historico (28 dias) |
| `agendadas` | integer | Consultas ja agendadas |
| `slots_livres` | integer | Slots disponiveis |
| `ocupacao_pct` | float | Percentual de ocupacao |
| `periodos` | object | Distribuicao por periodo (manha/tarde/noite) |

---

## 5. Validar Consultas Agendadas

Retorna todas as consultas futuras agendadas para um medico especifico.

### Request

```http
GET https://clickcannabis.app.n8n.cloud/webhook/validar-consultas-agendadas?doctor_id=123
```

**Query Parameters:**

| Parametro | Tipo | Obrigatorio | Descricao |
|-----------|------|-------------|-----------|
| `doctor_id` | integer | Sim | ID do medico |

### Response

```json
[
  {
    "consulting_id": 45678,
    "doctor_id": 123,
    "user_id": 789,
    "status": "confirmed",
    "data_hora": "2026-01-16T14:00:00",
    "data": "2026-01-16",
    "hora": "14:00",
    "data_iso": "2026-01-16",
    "data_br": "16/01/2026",
    "dia_semana": "QUI"
  }
]
```

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `consulting_id` | integer | ID da consulta |
| `doctor_id` | integer | ID do medico |
| `user_id` | integer | ID do paciente |
| `status` | string | Status da consulta |
| `data_hora` | datetime | Data e hora completa (fuso Sao Paulo) |
| `data` | date | Apenas a data |
| `hora` | string | Apenas a hora (HH:MM) |
| `data_iso` | string | Data em formato ISO (YYYY-MM-DD) |
| `data_br` | string | Data em formato BR (DD/MM/YYYY) |
| `dia_semana` | string | Codigo do dia da semana |

---

## 6. Atualizar Hora do Medico

Atualiza os horarios de disponibilidade de um medico.

### Request

```http
POST https://clickcannabis.app.n8n.cloud/webhook/atualizar-hora-medico
Content-Type: application/json
```

**Body:**

```json
{
  "doctor_id": 123,
  "schedule": {
    "SEG": ["08:00-12:00", "14:00-18:00"],
    "TER": ["08:00-12:00", "14:00-18:00"],
    "QUA": ["08:00-12:00"],
    "QUI": ["14:00-18:00", "19:00-21:00"],
    "SEX": ["08:00-12:00", "14:00-18:00"],
    "SAB": [],
    "DOM": []
  }
}
```

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `doctor_id` | integer | Sim | ID do medico a ser atualizado |
| `schedule` | object | Sim | Objeto com horarios por dia da semana |

**Estrutura do `schedule`:**
- Chaves: `DOM`, `SEG`, `TER`, `QUA`, `QUI`, `SEX`, `SAB`
- Valores: Array de strings no formato `"HH:MM-HH:MM"`
- Array vazio `[]` = dia sem disponibilidade

### Response

```
Workflow got started.
```

**Nota:** Este endpoint responde imediatamente e processa em background.

---

## 7. Atualizar Prioridade do Medico

Atualiza a prioridade de distribuicao de multiplos medicos em lote.

### Request

```http
POST https://clickcannabis.app.n8n.cloud/webhook/atualizar-prioridade-medico
Content-Type: application/json
```

**Body:**

```json
[
  { "id": 123, "prioridade": 1 },
  { "id": 124, "prioridade": 2 },
  { "id": 125, "prioridade": 3 }
]
```

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `id` | integer | Sim | ID do medico |
| `prioridade` | integer | Sim | Valor de prioridade (menor = maior prioridade) |

### Response

```
Workflow got started.
```

**Nota:** Este endpoint responde imediatamente e processa em lote. Cada medico do array e processado sequencialmente.

---

## Informacoes Tecnicas

### Banco de Dados

Todas as queries executam no PostgreSQL conectado ao n8n. As principais tabelas utilizadas sao:

| Tabela | Uso |
|--------|-----|
| `doctors` | Dados dos medicos (id, name, crm, schedule, priority) |
| `users` | Dados de usuarios (email, phone) |
| `consultings` | Consultas medicas |
| `medical_prescriptions` | Prescricoes medicas |
| `product_budgets` | Orcamentos de produtos |

### Timezone

Todas as datas/horas retornam no fuso `America/Sao_Paulo`.

### Codigos de Dia da Semana

| Codigo | Dia | Numero |
|--------|-----|--------|
| DOM | Domingo | 0 |
| SEG | Segunda | 1 |
| TER | Terca | 2 |
| QUA | Quarta | 3 |
| QUI | Quinta | 4 |
| SEX | Sexta | 5 |
| SAB | Sabado | 6 |

### Status de Consulta

Consultas com status `preconsulting` e `cancelled` sao **ignoradas** em todas as queries.

---

## Exemplos de Uso (cURL)

### Listar medicos
```bash
curl -X GET "https://clickcannabis.app.n8n.cloud/webhook/listar-medicos"
```

### Metricas com periodo customizado
```bash
curl -X GET "https://clickcannabis.app.n8n.cloud/webhook/metricas-medicos-para-score?weeks=12"
```

### Calendario de um medico
```bash
curl -X GET "https://clickcannabis.app.n8n.cloud/webhook/ver-calendario-do-medico?doctor_id=123"
```

### Demanda de agendamento
```bash
curl -X GET "https://clickcannabis.app.n8n.cloud/webhook/demanda-de-agendamento"
```

### Consultas futuras de um medico
```bash
curl -X GET "https://clickcannabis.app.n8n.cloud/webhook/validar-consultas-agendadas?doctor_id=123"
```

### Atualizar horarios
```bash
curl -X POST "https://clickcannabis.app.n8n.cloud/webhook/atualizar-hora-medico" \
  -H "Content-Type: application/json" \
  -d '{"doctor_id": 123, "schedule": {"SEG": ["08:00-12:00"], "TER": ["14:00-18:00"]}}'
```

### Atualizar prioridades em lote
```bash
curl -X POST "https://clickcannabis.app.n8n.cloud/webhook/atualizar-prioridade-medico" \
  -H "Content-Type: application/json" \
  -d '[{"id": 123, "prioridade": 1}, {"id": 124, "prioridade": 2}]'
```

---

## Observacoes Importantes

1. **Autenticacao:** Nenhum endpoint requer autenticacao. Os webhooks sao publicos.

2. **Rate Limiting:** Nao ha limite de requisicoes documentado, mas recomenda-se uso moderado.

3. **Endpoints POST:** Os endpoints `atualizar-hora-medico` e `atualizar-prioridade-medico` respondem imediatamente com "Workflow got started." e processam em background.

4. **Endpoints GET:** Todos os endpoints GET aguardam o processamento e retornam os dados completos.

5. **Erro comum:** Se `doctor_id` nao for enviado nos endpoints que exigem, a query falhara.
