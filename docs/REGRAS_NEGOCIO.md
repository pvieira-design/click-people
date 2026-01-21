# Regras de Negócio - Click People

**Versão:** 1.1 | **Data:** Janeiro 2026  
**Sistema:** Click People (Gestão de Capital Humano)  
**Cliente:** Click Cannabis

---

## 1. Visão Geral

O Click People é um sistema de gestão de capital humano que controla e automatiza fluxos de aprovação de solicitações relacionadas a prestadores de serviço da Click Cannabis.

**Usuários do sistema:** Colaboradores internos da Click Cannabis (~67 pessoas)  
**Médicos parceiros (~50):** NÃO têm acesso a este sistema (sistema separado)

---

## 2. Estrutura Organizacional

### 2.1 Cargos e Hierarquia

| Cargo | Nível | Pode Aprovar? | Observação |
|-------|-------|---------------|------------|
| Analista | 10 | ❌ Não | Visualiza apenas |
| Gerente | 50 | ❌ Não | Visualiza apenas |
| Head | 70 | ❌ Não | Visualiza apenas |
| Diretor | 80 | ✅ Sim | Aprova 1ª etapa de suas áreas |
| Diretor RH | 90 | ✅ Sim | Aprova etapas de RH |
| CFO | 95 | ✅ Sim | Aprova etapas financeiras |
| CEO | 100 | ✅ Sim | Aprovador final máximo |

**Regra:** Quanto maior o nível hierárquico, maior a autoridade.

### 2.2 Áreas da Empresa (12 áreas)

1. Atendimento - Consulta Médica
2. Atendimento - Documentação
3. Atendimento - Inicial
4. Atendimento - Pós Venda
5. Atendimento - Receita & Orçamento
6. Financeiro
7. Geral
8. Gestão de Médicos
9. Marketing
10. Operações
11. RH
12. Tecnologia

**Regra:** Um usuário PODE pertencer a MÚLTIPLAS áreas (ex: Diretor responsável por 3 áreas).

---

## 3. Sistema de Usuários

### 3.1 Cadastro (Self-service)

**Campos obrigatórios no cadastro:**
- Nome completo
- Email (validação de formato)
- Senha (requisitos de segurança)

**Fluxo:**
1. Usuário acessa página de cadastro
2. Preenche campos e submete
3. Conta criada com status **"Pendente de Aprovação"**
4. Usuário NÃO consegue acessar nada até aprovação
5. Admin visualiza na lista de pendentes
6. Admin aprova e define: Área(s), Cargo, Permissão Admin

### 3.2 Estados de Usuário

| Status | Descrição | Acesso ao Sistema |
|--------|-----------|-------------------|
| Pendente de Aprovação | Aguardando admin | ❌ Nenhum |
| Ativo | Aprovado | ✅ Conforme cargo |
| Rejeitado | Negado pelo admin | ❌ Nenhum |
| Desativado | Desabilitado | ❌ Nenhum |

### 3.3 Permissões por Tipo

#### Usuários Comuns (Analista, Gerente, Head)
- ✅ Visualizar o sistema e áreas
- ✅ Ver status de solicitações (incluindo próprias)
- ❌ Criar solicitações
- ❌ Aprovar/rejeitar solicitações

#### Diretores de Área
- ✅ Criar solicitações em todos os módulos
- ✅ Aprovar/rejeitar na 1ª etapa de SUA(S) área(s)
- ✅ Pode ser responsável por múltiplas áreas

#### Diretor RH
- ✅ Aprovar/rejeitar na etapa de RH
- ✅ Atualizar status de contratações
- ✅ Editar dados da Folha

#### CFO
- ✅ Aprovar/rejeitar na etapa financeira
- ✅ Aprovador final em Solicitação de Compra

#### CEO
- ✅ Aprovar/rejeitar em qualquer etapa final
- ✅ Autoridade máxima

#### Administradores
- ✅ Todas as permissões acima
- ✅ Excluir solicitações e prestadores
- ✅ Acesso ao painel administrativo completo
- ✅ Ver logs de auditoria

---

## 4. Fluxos de Aprovação

### 4.1 Regras Gerais

1. Cada etapa só pode ser aprovada/rejeitada pelo responsável
2. Uma rejeição em QUALQUER etapa encerra o fluxo
3. Criador pode excluir solicitação PENDENTE (ou admin)
4. Aprovadores DEVEM adicionar comentário em rejeições
5. Histórico de aprovações é mantido em cada solicitação
6. Fluxos são **CONFIGURÁVEIS** via Admin > Configurações

### 4.2 Estados de Solicitação

| Estado | Descrição | Cor UI |
|--------|-----------|--------|
| Pendente | Aguardando alguma etapa | 🟡 Amarelo |
| Aprovada | Todas etapas concluídas | 🟢 Verde |
| Rejeitada | Rejeitada em alguma etapa | 🔴 Vermelho |

### 4.3 Fluxos por Módulo

**Nota:** Os fluxos abaixo são os valores **padrão**. Admin pode configurar as etapas de cada fluxo via Admin > Configurações (interface drag-and-drop).

| Módulo | Etapa 1 | Etapa 2 | Etapa 3 | Etapa 4 |
|--------|---------|---------|---------|---------|
| Recesso/Férias | Área da Solicitação | RH | Sócio | - |
| Desligamento | Área da Solicitação | RH | Sócio | - |
| Contratação | Área da Solicitação | RH | Financeiro | Sócio |
| Solicitação de Compra | Área da Solicitação | Financeiro | - | - |
| Mudança de Remuneração | Área da Solicitação | RH | Financeiro | Sócio |

**Regra:** A primeira etapa é sempre a **Área da Solicitação** (REQUEST_AREA) e não pode ser removida.

### 4.4 Aprovação Manual Obrigatória

**Todas as etapas requerem aprovação manual.** Não existe auto-aprovação no sistema.

- Mesmo que um diretor crie solicitação de sua própria área, a etapa precisa ser aprovada manualmente
- Mesmo que o CFO crie uma Solicitação de Compra, as etapas precisam ser aprovadas
- A solicitação sempre inicia com todas as etapas em status PENDENTE

### 4.5 Aprovação como Admin (Override)

Quando um administrador aprova uma etapa no lugar do aprovador designado:
- O sistema registra que foi uma aprovação "como admin"
- A timeline de aprovação exibe um aviso visual indicando que a aprovação foi feita por admin
- O histórico mantém registro de quem realmente aprovou

### 4.6 Fluxos Configuráveis

Os fluxos de aprovação podem ser configurados via Admin > Configurações:
- Interface drag-and-drop para reordenar etapas
- Possibilidade de adicionar ou remover áreas do fluxo
- A primeira etapa (Área da Solicitação) é fixa e não pode ser removida
- Configurações são salvas no banco de dados (tabela SystemConfig)

---

## 5. Módulo: Recesso / Férias

### 5.1 Objetivo
Gerenciar solicitações de período de afastamento para prestadores de serviço.

### 5.2 Campos

| Campo | Tipo | Obrigatório | Observação |
|-------|------|-------------|------------|
| Prestador | FK (select) | ✅ Sim | Apenas ativos |
| Área | string | Auto | Preenchido do prestador |
| Cargo | string | Auto | Preenchido do prestador |
| Data de Início | date | ✅ Sim | - |
| Data de Fim | date | ✅ Sim | >= Data Início |
| Quantidade de dias | number | Auto | Calculado |
| Motivo/Observação | text | ❌ Não | - |

### 5.3 Regras de Negócio

1. **Cálculo de dias:** `Data Fim - Data Início + 1`
2. **Validação de datas:** Data fim >= Data início
3. **Sobreposição:** Sistema DETECTA e BLOQUEIA sobreposição com recessos já aprovados do mesmo prestador
4. **Limite anual:** NÃO existe limite fixo
5. **Aviso 20 dias:** Se prestador já teve 20+ dias no ano, exibir AVISO (não bloqueio)

### 5.4 Fluxo
`Diretor da Área → Diretor RH → CEO`

### 5.5 Ação pós-aprovação
Nenhuma ação automática (apenas registro histórico).

---

## 6. Módulo: Desligamento

### 6.1 Objetivo
Gerenciar solicitações de desligamento de prestadores de serviço.

### 6.2 Campos

| Campo | Tipo | Obrigatório | Observação |
|-------|------|-------------|------------|
| Prestador | FK (select) | ✅ Sim | Apenas ativos |
| Área | string | Auto | Preenchido do prestador |
| Cargo | string | Auto | Preenchido do prestador |
| Razão do Desligamento | text | ✅ Sim | Mínimo detalhado |

### 6.3 Regras de Negócio

1. **Razão obrigatória:** Campo deve ter conteúdo substantivo
2. **Aviso visual:** Exibir mensagem: *"Após aprovação final, o prestador será automaticamente desativado"*

### 6.4 Fluxo
`Diretor da Área → Diretor RH → CEO`

### 6.5 Ação pós-aprovação
Prestador é marcado como **INATIVO** na Folha automaticamente.

---

## 7. Módulo: Contratação

### 7.1 Objetivo
Gerenciar solicitações de novas contratações de prestadores de serviço.

### 7.2 Campos

| Campo | Tipo | Obrigatório | Observação |
|-------|------|-------------|------------|
| Tipo de Contratação | radio | ✅ Sim | "Aumento de Quadro" ou "Substituição" |
| Prestador Substituído | FK (select) | Condicional | Se tipo = Substituição |
| Cargo | FK (dropdown) | ✅ Sim | - |
| Área | FK (dropdown) | ✅ Sim | - |
| Salário Proposto | decimal | ✅ Sim | Formatado R$ |
| Data Prevista de Início | date | ✅ Sim | - |
| Nível de Prioridade | enum | ✅ Sim | Alta, Média, Baixa |
| Motivo da Contratação | text | ❌ Não | - |

### 7.3 Regras de Negócio

1. **Tipo Substituição:** OBRIGA selecionar prestador a ser substituído
2. **Sobreposição permitida:** Pode haver dois prestadores simultâneos durante transição
3. **Pós-aprovação:** Move para aba "Status de Contratação"

### 7.4 Fluxo
`Diretor da Área → Diretor RH → CFO → CEO`

### 7.5 Status de Contratação (pós-aprovação)

| Estado | Descrição | Quem atualiza |
|--------|-----------|---------------|
| Aguardando | Processo não iniciado | Dir. RH |
| Em Andamento | Recrutamento em progresso | Dir. RH |
| Contratado | Finalizado | Dir. RH |

**Ao marcar "Contratado":**
- Dir. RH informa: Nome completo, Data de início real
- Sistema cria automaticamente novo prestador na Folha
- Se Substituição: prestador substituído é desativado automaticamente

---

## 8. Módulo: Solicitação de Compra

### 8.1 Objetivo
Gerenciar solicitações de aprovação de despesas e compras.

### 8.2 Campos

| Campo | Tipo | Obrigatório | Observação |
|-------|------|-------------|------------|
| Nome do Solicitante | string | Auto | Do usuário logado |
| Área do Solicitante | string | Auto | Do usuário logado |
| Cargo do Solicitante | string | Auto | Do usuário logado |
| Nome da Despesa/Serviço | string | ✅ Sim | - |
| Valor | decimal | ✅ Sim | Formatado R$ |
| Data de Pagamento | date | ✅ Sim | - |

### 8.3 Regras de Negócio

1. **Dados automáticos:** Solicitante, área e cargo preenchidos do perfil logado
2. **Aprovação manual:** Todas as etapas requerem aprovação manual (não há auto-aprovação)

### 8.4 Configuração Futura (já implementar estrutura)

**Auto-aprovação por valor:**
- Admin configura: "Compras até R$X são auto-aprovadas para cargo Y"
- Tela em Admin > Configurações
- Estrutura no banco já preparada

### 8.5 Fluxo
`Diretor da Área → CFO`

### 8.6 Ação pós-aprovação
Nenhuma ação automática (apenas registro histórico).

---

## 9. Módulo: Mudança de Remuneração

### 9.1 Objetivo
Gerenciar solicitações de alteração de salário de prestadores de serviço.

### 9.2 Campos

| Campo | Tipo | Obrigatório | Observação |
|-------|------|-------------|------------|
| Prestador | FK (select) | ✅ Sim | Apenas ativos |
| Área | string | Auto | Preenchido do prestador |
| Cargo | string | Auto | Preenchido do prestador |
| Salário Atual | decimal | Auto | Exibido, não editável |
| Novo Salário | decimal | ✅ Sim | Formatado R$ |
| Data de Vigência | date | ✅ Sim | Não pode ser passado |
| Nível de Prioridade | enum | ✅ Sim | Alta, Média, Baixa |
| Razão da Mudança | text | ✅ Sim | - |

### 9.3 Regras de Negócio

1. **Sem limite de aumento:** Não há percentual máximo
2. **Sem intervalo mínimo:** Não há período mínimo entre aumentos
3. **Comparação visual:** Exibir salário atual para referência
4. **Validação data:** Data de vigência não pode ser no passado

### 9.4 Fluxo
`Diretor da Área → Diretor RH → CFO → CEO`

### 9.5 Ação pós-aprovação
Salário do prestador é atualizado automaticamente na Folha.

---

## 10. Módulo: Folha

### 10.1 Objetivo
Central de visualização e gestão de todos os prestadores de serviço.

### 10.2 Sub-aba: Folha (Dados Contratuais)

**Campos exibidos:**

| Campo | Tipo | Editável | Por quem |
|-------|------|----------|----------|
| Nome completo | string | ❌ | - |
| Área | FK | ❌ | - |
| Cargo | FK | ❌ | - |
| Salário | decimal | ✅ | Admin, Dir. RH |
| Data de Início | date | ❌ | - |
| Status NDA | enum | ✅ | Admin, Dir. RH |
| Status Contrato | enum | ✅ | Admin, Dir. RH |

**Status possíveis:**
- NDA: `Assinado` / `Não Assinado`
- Contrato: `Assinado` / `Não Assinado`

**Funcionalidades:**
- Lista todos os prestadores ativos
- Campo de busca (nome, área, cargo)
- Ordenação por colunas
- Exportação Excel: `folha-prestadores-YYYY-MM-DD.xlsx`

**Permissões:**
- Editar: Admin e Diretor RH
- Excluir: Apenas Admin

### 10.3 Sub-aba: Bônus

**Tiers de Bônus:**

| Tier | Nome | Percentual |
|------|------|------------|
| Sem Bônus | - | 0% |
| Bronze | Atingiu parcialmente | 10% |
| Prata | Atingiu meta | 15% |
| Ouro | Superou meta | 20% |

**Funcionamento:**
1. Admin/RH seleciona tier por área no mês
2. Feito no 1º dia útil (referente mês anterior)
3. Cálculo: `Bônus = Salário × Percentual`
4. Remuneração Total = Salário + Bônus

**Totalizadores:**
- Total de prestadores
- Folha Base (soma salários)
- Total em Bônus
- Remuneração Total

**Exportação:** `bonus-prestadores-YYYY-MM-DD.xlsx`

### 10.4 Integrações Automáticas

A Folha é afetada automaticamente por:

| Módulo | Quando | Ação na Folha |
|--------|--------|---------------|
| Contratação | Status = "Contratado" | Cria novo prestador |
| Desligamento | Aprovado | Marca inativo |
| Mudança Remuneração | Aprovado | Atualiza salário |

---

## 11. Prestadores

### 11.1 Entidade

Prestadores são entidade separada de usuários, mas relacionada.
- Um prestador PODE ter login (colaborador que usa o sistema)
- Um prestador PODE não ter login (apenas na Folha)

### 11.2 Campos

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Nome completo | string | ✅ |
| Área | FK | ✅ |
| Cargo | FK | ✅ |
| Salário | decimal | ✅ |
| Data de Início | date | ✅ |
| Status NDA | enum | ✅ |
| Status Contrato | enum | ✅ |
| Ativo | boolean | ✅ |

### 11.3 Gestão pelo Admin

Admin > Prestadores permite:
- Ver TODOS (ativos e inativos)
- Criar diretamente (sem fluxo de contratação)
- Editar todas as informações
- Ativar/Desativar manualmente

---

## 12. Auditoria e Logs

### 12.1 Eventos Registrados

| Evento | Dados Capturados |
|--------|------------------|
| Criação de solicitação | Quem, quando, dados completos |
| Visualização de solicitação | Quem, quando, qual solicitação |
| Edição de solicitação | Quem, quando, before/after (diff) |
| Aprovação/Rejeição | Quem, quando, comentário |
| Login de usuário | Quem, quando, IP |
| Logout de usuário | Quem, quando |

### 12.2 Acesso aos Logs

- **Log completo:** Apenas administradores
- **Histórico da solicitação:** Criador vê apenas aprovações/rejeições da própria
- **Logs são imutáveis:** Nunca deletados

### 12.3 Edição Pós-Finalização

- Solicitações aprovadas/rejeitadas PODEM ser editadas
- DEVE registrar: quem editou, quando, snapshot do antes
- Histórico faz parte do log de auditoria

---

## 13. Casos Especiais

### 13.1 Aprovador Desligado

- Aprovações PASSADAS: mantêm ele como responsável (histórico)
- Solicitações PENDENTES na fila dele: listadas separadamente
- Admin deve reorganizar manualmente ou excluir
- NÃO há transferência automática

### 13.2 Delegação de Aprovação

- NÃO existe no MVP
- Aprovador de férias = solicitações esperam
- (Pode ser implementado futuramente)

### 13.3 Aviso de Recesso 20+ dias

- Sistema verifica dias de recesso no ano corrente
- Se >= 20 dias: exibe AVISO (amarelo)
- NÃO bloqueia a criação
- Apenas alerta informativo

---

## 14. Validações Gerais

### 14.1 Campos de Data

- Data fim >= Data início (recesso)
- Data vigência >= hoje (remuneração)
- Formato: YYYY-MM-DD

### 14.2 Campos Monetários

- Formato: R$ X.XXX,XX
- Armazenar como decimal (centavos)
- Nunca valores negativos

### 14.3 Campos de Texto

- Razão de desligamento: mínimo 10 caracteres
- Razão de mudança remuneração: mínimo 10 caracteres
- Comentários de aprovação: opcional, mas recomendado
- Comentários de rejeição: obrigatório

---

## 15. Interface

### 15.1 Navegação Principal

**Menu Solicitações:**
1. Recesso / Férias *(com badge de pendências)*
2. Desligamento
3. Contratação *(com sub-aba Status)*
4. Solicitação de Compra
5. Mudança de Função *(desabilitado)*
6. Mudança de Remuneração
7. Folha *(com sub-abas Folha e Bônus)*

**Menu Administração (admin only):**
1. Painel Admin
2. Usuários
3. Prestadores
4. Áreas
5. Cargos
6. Configurações
7. Logs de Auditoria

### 15.2 Badge de Pendências

- Exibir no menu itens com solicitações pendentes para o usuário logado
- Considera: cargo do usuário, áreas que gerencia, etapa atual da solicitação
- Cor: vermelha

---

## 16. Glossário

| Termo | Definição |
|-------|-----------|
| Alçada | Nível de autoridade para aprovação |
| Prestador | Pessoa física/jurídica que presta serviço à Click Cannabis |
| Folha | Conjunto de prestadores ativos e seus dados contratuais |
| Etapa | Passo no fluxo de aprovação |
| MVP | Minimum Viable Product - versão inicial funcional |

---

*Documento criado em Janeiro 2026*  
*Atualizar conforme mudanças nas regras de negócio*