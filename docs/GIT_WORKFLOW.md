# Guia de Git - Click People

## O que e Git?

Git e um sistema de controle de versao. Pense nele como um "historico infinito" do seu codigo - voce pode voltar para qualquer momento do passado se algo der errado.

---

## Conceitos Basicos (Glossario)

| Termo | O que e | Analogia |
|-------|---------|----------|
| **Repositorio** | Pasta do projeto com todo o historico | Pasta de documentos com backup automatico |
| **Commit** | "Foto" do codigo em um momento | Save game - salva o estado atual |
| **Branch** | Versao paralela do codigo | Copia de trabalho para testar coisas |
| **Main** | Branch principal (producao) | Versao "oficial" do projeto |
| **Push** | Enviar commits para o GitHub | Upload das suas alteracoes |
| **Pull** | Baixar commits do GitHub | Download de alteracoes |
| **Merge** | Juntar uma branch em outra | Aplicar mudancas de teste na versao oficial |

---

## Fluxo Seguro de Trabalho

### Regra de Ouro

> **NUNCA trabalhe diretamente na `main`**
>
> Sempre crie uma branch, teste, e so depois junte na main.

### Fluxo Visual

```
main (producao) ────●────●────●────●────●──── (sempre funcionando)
                         \              /
feature/nova-tela ────────●────●────●─── (sua area de teste)
```

---

## Comandos do Dia a Dia

### 1. Antes de Comecar a Trabalhar

```bash
# Sempre atualize seu codigo local primeiro
git pull origin main
```

### 2. Criar uma Branch para Trabalhar

```bash
# Cria e ja entra na branch nova
git checkout -b feature/nome-da-mudanca

# Exemplos de nomes:
# git checkout -b feature/nova-pagina-relatorios
# git checkout -b fix/corrigir-bug-login
# git checkout -b update/atualizar-prestadores
```

**Convencao de nomes:**
- `feature/` - Nova funcionalidade
- `fix/` - Correcao de bug
- `update/` - Atualizacao/melhoria

### 3. Fazer Suas Alteracoes

Edite os arquivos normalmente. O Git vai rastrear tudo.

### 4. Ver o que Mudou

```bash
# Ver arquivos modificados
git status

# Ver o que mudou em cada arquivo (opcional)
git diff
```

### 5. Salvar Suas Alteracoes (Commit)

```bash
# Adiciona todos os arquivos modificados
git add .

# Cria o commit (save point)
git commit -m "Descricao do que foi feito"

# Exemplos de mensagens:
# git commit -m "Adiciona pagina de relatorios"
# git commit -m "Corrige bug no calculo de bonus"
# git commit -m "Atualiza lista de prestadores"
```

**Dica:** Faca commits frequentes! E melhor ter muitos commits pequenos do que um gigante.

### 6. Enviar para o GitHub

```bash
# Primeiro push da branch (cria ela no GitHub)
git push -u origin feature/nome-da-mudanca

# Proximos pushes da mesma branch
git push
```

### 7. Testar no Vercel (Preview)

Quando voce faz push de uma branch que nao e `main`, o Vercel cria um **Preview Deploy** automatico. Voce pode testar la antes de ir para producao!

- Acesse: https://vercel.com/pvieira-clickcannabis-projects/click-people-web
- Veja a lista de deployments
- Branches aparecem como "Preview"

### 8. Se Tudo Estiver OK - Juntar na Main

```bash
# Voltar para a main
git checkout main

# Atualizar a main (caso alguem tenha mudado algo)
git pull origin main

# Juntar sua branch na main
git merge feature/nome-da-mudanca

# Enviar para producao
git push origin main
```

### 9. Limpar a Branch (Opcional)

```bash
# Deletar branch local (ja foi juntada)
git branch -d feature/nome-da-mudanca

# Deletar branch no GitHub
git push origin --delete feature/nome-da-mudanca
```

---

## Situacoes de Emergencia

### "Quebrei tudo! Como volto atras?"

#### Opcao 1: Descartar mudancas NAO commitadas

```bash
# Descarta TODAS as mudancas que voce fez (cuidado!)
git checkout .

# Ou descartar apenas um arquivo especifico
git checkout -- caminho/do/arquivo.tsx
```

#### Opcao 2: Voltar para um commit anterior

```bash
# Ver historico de commits
git log --oneline

# Exemplo de saida:
# 17f4a6f Add deployment documentation
# b726864 Fix Vercel output directory
# 32abddd Fix gitignore
# e4670c8 Configure Vercel and Neon

# Voltar para um commit especifico (cria nova branch)
git checkout -b backup/antes-do-problema e4670c8
```

#### Opcao 3: Reverter o ultimo commit

```bash
# Desfaz o ultimo commit mas MANTEM as mudancas nos arquivos
git reset --soft HEAD~1

# Desfaz o ultimo commit e DESCARTA as mudancas
git reset --hard HEAD~1
```

#### Opcao 4: Reverter um commit especifico (mais seguro)

```bash
# Cria um NOVO commit que desfaz as mudancas do commit especificado
git revert 17f4a6f
```

### "A main esta quebrada em producao!"

```bash
# 1. Encontre o ultimo commit que funcionava
git log --oneline

# 2. Reverta para ele
git revert HEAD --no-edit  # Reverte o ultimo commit

# 3. Ou reverta multiplos commits
git revert HEAD~3..HEAD --no-edit  # Reverte os ultimos 3 commits

# 4. Envie a correcao
git push origin main
```

### "Comecei a trabalhar na main sem querer!"

```bash
# 1. Salve suas mudancas temporariamente
git stash

# 2. Crie a branch que deveria ter criado
git checkout -b feature/minha-mudanca

# 3. Recupere suas mudancas
git stash pop

# 4. Continue trabalhando normalmente
```

---

## Fluxo Completo - Exemplo Pratico

Voce quer adicionar uma nova pagina de relatorios:

```bash
# 1. Atualizar codigo
git pull origin main

# 2. Criar branch
git checkout -b feature/pagina-relatorios

# 3. Fazer as mudancas no codigo...
# (edita arquivos, cria componentes, etc)

# 4. Verificar mudancas
git status

# 5. Commitar
git add .
git commit -m "Adiciona estrutura basica da pagina de relatorios"

# 6. Mais mudancas...
git add .
git commit -m "Adiciona graficos na pagina de relatorios"

# 7. Enviar para GitHub (testar no Preview)
git push -u origin feature/pagina-relatorios

# 8. Testar no Vercel Preview...
# Se OK, continuar:

# 9. Juntar na main
git checkout main
git pull origin main
git merge feature/pagina-relatorios
git push origin main

# 10. Deploy automatico no Vercel!

# 11. Limpar
git branch -d feature/pagina-relatorios
```

---

## Comandos de Consulta Uteis

```bash
# Ver em qual branch voce esta
git branch

# Ver todas as branches (locais e remotas)
git branch -a

# Ver historico de commits
git log --oneline

# Ver historico com grafico
git log --oneline --graph --all

# Ver mudancas de um commit especifico
git show abc1234

# Ver quem mudou cada linha de um arquivo
git blame caminho/do/arquivo.tsx
```

---

## Boas Praticas

### Mensagens de Commit

**Bom:**
- `Adiciona validacao de email no formulario de cadastro`
- `Corrige calculo de bonus quando tier e NONE`
- `Atualiza dependencias do projeto`

**Ruim:**
- `fix`
- `mudancas`
- `asdfasdf`
- `WIP`

### Frequencia de Commits

- Commite sempre que completar uma "unidade logica" de trabalho
- Melhor ter 10 commits pequenos do que 1 gigante
- Cada commit deve deixar o codigo funcionando

### Branches

- Uma branch por funcionalidade/bug
- Nao deixe branches abertas por muito tempo (max 1-2 dias)
- Delete branches depois de juntar na main

---

## Resumo Visual

```
VOCE QUER FAZER UMA MUDANCA?
            |
            v
    git pull origin main
            |
            v
    git checkout -b feature/nome
            |
            v
    [faz as mudancas]
            |
            v
    git add . && git commit -m "msg"
            |
            v
    git push -u origin feature/nome
            |
            v
    [testa no Vercel Preview]
            |
      Funcionou?
       /      \
     Sim      Nao
      |        |
      v        v
    Merge    Corrige e
    na main  commita de novo
      |
      v
    git checkout main
    git merge feature/nome
    git push origin main
            |
            v
    [Deploy automatico!]
```

---

## Precisa de Ajuda?

Se algo der errado e voce nao souber resolver:

1. **NAO entre em panico**
2. **NAO faca mais commits tentando "consertar"**
3. Anote o que voce fez
4. Pergunte antes de executar comandos de "reset" ou "force"

O Git guarda TUDO. E quase impossivel perder codigo de verdade se voce nao forcar.
