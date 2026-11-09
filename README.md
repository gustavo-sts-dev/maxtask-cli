# Maxtask — Gestão de tarefas pelo terminal

## 📖 Sobre o projeto

O **Maxtask** é uma aplicação de linha de comando (CLI) voltada ao gerenciamento de tarefas. Por meio do terminal, o usuário pode criar, listar, editar e excluir tarefas, além de agendar lembretes e armazenar os dados em um arquivo JSON.

Desenvolvi este projeto com o objetivo de praticar operações de entrada e saída (I/O) utilizando Node.js, além de reforçar conhecimentos sobre expressões regulares (Regex) e manipulação de datas.

## ✨ Funcionalidades

- **Cadastro de tarefas:** permite criar tarefas informando nome, data e horário.
- **Listagem de tarefas:** exibe todas as tarefas cadastradas e suas informações.
- **Edição de tarefas:** permite atualizar o nome, a data, o horário e a configuração de lembrete utilizando o ID da tarefa.
- **Exclusão de tarefas:** permite remover uma tarefa individualmente por seu identificador.
- **Lembretes opcionais:** permite agendar notificações no terminal para a data e o horário definidos.
- **Identificação única:** cada tarefa recebe um UUID, permitindo diferenciar tarefas com nomes iguais.
- **Persistência de dados:** armazena as tarefas em um arquivo JSON, preservando os registros após o encerramento da aplicação.

## 🛠️ Tecnologias utilizadas

- **Node.js:** ambiente de execução JavaScript utilizado para desenvolver a aplicação e acessar recursos nativos do sistema.
- **TypeScript:** linguagem utilizada para adicionar tipagem estática e melhorar a organização e manutenção do código.
- **Node.js File System (`node:fs/promises`):** leitura e escrita assíncrona das tarefas no arquivo JSON.
- **Node.js Readline (`node:readline/promises`):** interação com o usuário por meio do terminal.
- **Node.js Crypto (`node:crypto`):** geração de identificadores UUID para cada tarefa.
- **Regex:** interpretação dos comandos e validação dos formatos de data e horário.

O projeto utiliza módulos nativos do Node.js, sem frameworks de aplicação.

## 📋 Pré-requisitos

Para executar o Maxtask, é necessário ter instalado:

- Node.js (recomendada uma versão recente, como Node.js 20 ou superior).
- npm, normalmente distribuído com o Node.js.

O projeto também utiliza TypeScript e TSX para executar o código durante o desenvolvimento.

## 🚀 Instalação e execução

**1. Obtenha o projeto**

Clone ou baixe o repositório e abra sua pasta no terminal.

**2. Instale as dependências**

Caso o projeto já tenha um `package.json` configurado, execute:

```bash
npm install
```

As dependências de desenvolvimento utilizadas são `typescript`, `tsx` e `@types/node`.

**3. Execute a aplicação**

```bash
npx tsx index.ts
```

Após iniciar, o terminal apresentará os comandos disponíveis.

Os dados serão armazenados no arquivo `tasks.json`, criado automaticamente após o primeiro cadastro ou edição que salve tarefas.

## 💻 Comandos disponíveis

Todos os comandos devem ser digitados em uma única linha.

### Criar tarefa

```text
/criar --nome="Estudar Node.js" --dia=15/11/2030 --horario=14:30 --lembrar=true
```

O argumento `--lembrar` é opcional. Quando não informado, o lembrete permanece desativado.

### Listar tarefas

```text
/listar
```

Exibe todas as tarefas cadastradas, incluindo seus identificadores, nomes, datas, horários e configuração de lembrete.

### Editar tarefa

Para editar uma tarefa, é necessário informar seu UUID.

**Alterar o nome:**

```text
/editar --id=SEU_UUID --novo-nome="Estudar TypeScript"
```

**Alterar data e horário:**

```text
/editar --id=SEU_UUID --dia=16/11/2030 --horario=15:00
```

**Ativar um lembrete:**

```text
/editar --id=SEU_UUID --lembrar=true
```

**Desativar um lembrete:**

```text
/editar --id=SEU_UUID --lembrar=false
```

É possível alterar diferentes propriedades em um mesmo comando.

Substitua `SEU_UUID` pelo identificador real da tarefa, disponível em `/listar`.

### Excluir tarefa

```text
/excluir --id=SEU_UUID
```

Remove a tarefa correspondente ao identificador informado e cancela seu lembrete, caso exista.

### Ajuda e encerramento

```text
/ajuda
```

Exibe os comandos disponíveis.

```text
/sair
```

Encerra a aplicação.

## 📁 Persistência de dados

O Maxtask utiliza um arquivo JSON como mecanismo de persistência local.

As tarefas são mantidas em memória durante a execução e armazenadas em `tasks.json` após operações de criação, edição ou exclusão.

Ao iniciar a aplicação, os registros são carregados desse arquivo, permitindo recuperar tarefas cadastradas anteriormente.

Cada registro contém as seguintes propriedades:

| Propriedade | Descrição |
|---|---|
| `id` | Identificador único da tarefa (UUID) |
| `name` | Nome da tarefa |
| `date` | Data no formato DD/MM/AAAA |
| `time` | Horário no formato HH:mm |
| `remind` | Indica se o lembrete está ativado |

Caso o arquivo ainda não exista, a aplicação inicia com uma lista vazia.

A persistência em JSON foi escolhida para exercitar operações de leitura e escrita de arquivos sem a necessidade de um banco de dados.

## 🧠 Decisões técnicas

### Utilização de Node.js sem framework

Optei por utilizar recursos nativos do Node.js para compreender melhor o funcionamento das operações de entrada e saída, manipulação de arquivos e execução assíncrona.

### Identificação por UUID

Cada tarefa possui um identificador único gerado com `randomUUID()`.

Essa abordagem permite identificar tarefas individualmente, mesmo quando possuem nomes iguais, evitando depender de propriedades que podem ser alteradas.

### Interpretação de comandos com Regex

Os comandos são interpretados utilizando expressões regulares, permitindo separar o nome da operação e os argumentos fornecidos pelo usuário.

A implementação também aceita valores com espaços quando delimitados por aspas.

### Persistência com operações assíncronas

As operações de leitura e escrita utilizam `async/await` e a API `node:fs/promises`.

As alterações são salvas no arquivo antes de atualizar a coleção de tarefas em memória.

### Agendamento de lembretes

Os lembretes são implementados utilizando `setTimeout()`.

Os timers ativos são organizados em um `Map`, associando cada identificador de tarefa ao seu respectivo temporizador.

Essa estrutura facilita o cancelamento e reagendamento de lembretes durante operações de edição e exclusão.

## ⚠️ Limitações conhecidas

- **Lembretes dependem da execução:** a aplicação precisa permanecer aberta para que as notificações sejam exibidas no horário programado.
- **Lembretes perdidos:** notificações cujo horário passou enquanto a aplicação estava fechada não são exibidas retroativamente.
- **Persistência local:** os dados são armazenados em um arquivo JSON, sem sincronização entre dispositivos ou usuários.
- **Acesso simultâneo:** não existe controle de concorrência para múltiplas instâncias modificando o mesmo arquivo.
- **Notificações:** os lembretes são exibidos somente no terminal, sem integração com notificações do sistema operacional.
- **Testes automatizados:** a implementação ainda não possui uma suíte de testes automatizados.

Essas limitações representam oportunidades de melhoria em versões futuras.

## 👨‍💻 Autor

**Gustavo da Silva Santos**  
Desenvolvedor Fullstack