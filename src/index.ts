import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";

interface Task {
  id: string;
  name: string;
  date: string;
  time: string;
  remind: boolean;
}

type Args = Record<string, string>;

const FILE_PATH = path.join(process.cwd(), "tasks.json");

// Limite do setTimeout: aproximadamente 24 dias e 20 horas.
const MAX_TIMEOUT = 2_147_483_647;

const rl = createInterface({
  input: stdin,
  output: stdout,
});

let tasks: Task[] = [];

const timers = new Map<string, NodeJS.Timeout>();

function parseInput(input: string): {
  command: string;
  args: Args;
} {
  const text = input.trim();
  const match = /^\/([a-zA-Z][\w-]*)(?=\s|$)/.exec(text);

  if (!match) {
    throw new Error("Comando inválido. Digite /ajuda.");
  }

  const command = match[1].toLowerCase();
  const remaining = text.slice(match[0].length);
  const args: Args = Object.create(null);

  const regex = /\s+--([\w-]+)=(?:"([^"]*)"|'([^']*)'|([^\s"']+))/gy;

  let position = 0;

  while (position < remaining.length) {
    if (!remaining.slice(position).trim()) {
      break;
    }

    regex.lastIndex = position;

    const result = regex.exec(remaining);

    if (!result) {
      throw new Error("Argumentos inválidos. Verifique espaços e aspas.");
    }

    const key = result[1]!;
    const value = result[2] ?? result[3] ?? result[4] ?? "";

    if (Object.hasOwn(args, key)) {
      throw new Error(`Argumento repetido: --${key}`);
    }

    args[key] = value;
    position = regex.lastIndex;
  }

  return { command, args };
}

function validateArgs(args: Args, allowed: string[]): void {
  for (const key of Object.keys(args)) {
    if (!allowed.includes(key)) {
      throw new Error(`Argumento desconhecido: --${key}`);
    }
  }
}

function requireArg(args: Args, key: string): string {
  const value = args[key];

  if (value === undefined) {
    throw new Error(`Informe o argumento --${key}.`);
  }

  return value;
}

function validateName(name: string): string {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("O nome da tarefa não pode estar vazio.");
  }

  return trimmedName;
}

function parseBoolean(
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  if (value === undefined) return defaultValue;
  if (value === "true") return true;
  if (value === "false") return false;

  throw new Error("--lembrar deve ser true ou false.");
}

function parseDate(date: string, time: string): Date {
  const dateMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);

  if (!dateMatch || !timeMatch) {
    throw new Error("Use os formatos DD/MM/AAAA e HH:mm.");
  }

  const day = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const year = Number(dateMatch[3]);

  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);

  const result = new Date(year, month - 1, day, hours, minutes);

  if (
    result.getFullYear() !== year ||
    result.getMonth() !== month - 1 ||
    result.getDate() !== day ||
    result.getHours() !== hours ||
    result.getMinutes() !== minutes
  ) {
    throw new Error("Data ou horário inválido.");
  }

  return result;
}

function validateReminder(task: Task): void {
  const reminderDate = parseDate(task.date, task.time);

  if (task.remind && reminderDate.getTime() <= Date.now()) {
    throw new Error("O lembrete precisa ter uma data futura.");
  }
}

function isTask(value: unknown): value is Task {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.date === "string" &&
    typeof item.time === "string" &&
    typeof item.remind === "boolean"
  );
}

async function loadTasks(): Promise<Task[]> {
  try {
    const content = await readFile(FILE_PATH, "utf8");
    const data: unknown = JSON.parse(content);

    if (!Array.isArray(data) || !data.every(isTask)) {
      throw new Error("Estrutura inválida no arquivo JSON.");
    }

    for (const task of data) {
      validateName(task.name);
      parseDate(task.date, task.time);
    }

    return data;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function saveTasks(updatedTasks: Task[]): Promise<void> {
  const content = JSON.stringify(updatedTasks, null, 2);

  await writeFile(FILE_PATH, content, "utf8");
}

function cancelReminder(id: string): void {
  const timer = timers.get(id);

  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
}

function scheduleReminder(task: Task): void {
  cancelReminder(task.id);

  if (!task.remind) return;

  const reminderDate = parseDate(task.date, task.time);
  const remaining = reminderDate.getTime() - Date.now();

  if (remaining <= 0) return;

  const timer = setTimeout(
    () => {
      timers.delete(task.id);

      const timeLeft = parseDate(task.date, task.time).getTime() - Date.now();

      if (timeLeft > 0) {
        scheduleReminder(task);
        return;
      }

      console.log(`\n🔔 Lembrete: ${task.name}`);
    },
    Math.min(remaining, MAX_TIMEOUT),
  );

  timers.set(task.id, timer);
}

async function createTask(args: Args): Promise<void> {
  validateArgs(args, ["nome", "dia", "horario", "lembrar"]);

  const task: Task = {
    id: randomUUID(),
    name: validateName(requireArg(args, "nome")),
    date: requireArg(args, "dia"),
    time: requireArg(args, "horario"),
    remind: parseBoolean(args["lembrar"], false),
  };

  validateReminder(task);

  const updatedTasks = [...tasks, task];

  await saveTasks(updatedTasks);
  tasks = updatedTasks;

  scheduleReminder(task);

  console.log(`\nTarefa "${task.name}" criada com sucesso!`);
  console.log(`ID: ${task.id}`);
}

function listTasks(): void {
  if (tasks.length === 0) {
    console.log("\nNenhuma tarefa cadastrada.");
    return;
  }

  console.log("\n--- LISTA DE TAREFAS ---");

  for (const task of tasks) {
    console.log(`
ID: ${task.id}
Nome: ${task.name}
Data: ${task.date}
Horário: ${task.time}
Lembrete: ${task.remind ? "Sim" : "Não"}
-----------------------`);
  }
}

async function editTask(args: Args): Promise<void> {
  validateArgs(args, ["id", "novo-nome", "dia", "horario", "lembrar"]);

  const id = requireArg(args, "id");
  const task = tasks.find((item) => item.id === id);

  if (!task) {
    throw new Error("Tarefa não encontrada.");
  }

  if (
    args["novo-nome"] === undefined &&
    args["dia"] === undefined &&
    args["horario"] === undefined &&
    args["lembrar"] === undefined
  ) {
    throw new Error("Informe pelo menos um campo para editar.");
  }

  const updatedTask: Task = {
    ...task,
    name:
      args["novo-nome"] !== undefined
        ? validateName(args["novo-nome"])
        : task.name,
    date: args["dia"] ?? task.date,
    time: args["horario"] ?? task.time,
    remind: parseBoolean(args["lembrar"], task.remind),
  };

  validateReminder(updatedTask);

  const updatedTasks = tasks.map((item) =>
    item.id === id ? updatedTask : item,
  );

  await saveTasks(updatedTasks);
  tasks = updatedTasks;

  scheduleReminder(updatedTask);

  console.log(`\nTarefa "${updatedTask.name}" editada com sucesso!`);
}

async function deleteTask(args: Args): Promise<void> {
  validateArgs(args, ["id"]);

  const id = requireArg(args, "id");
  const task = tasks.find((item) => item.id === id);

  if (!task) {
    throw new Error("Tarefa não encontrada.");
  }

  const updatedTasks = tasks.filter((item) => item.id !== id);

  await saveTasks(updatedTasks);
  tasks = updatedTasks;

  cancelReminder(id);

  console.log(`\nTarefa "${task.name}" excluída com sucesso!`);
}

function showHelp(): void {
  console.log(`
--- COMANDOS DISPONÍVEIS ---

Criar tarefa:
  /criar --nome="Estudar Node.js" --dia=15/11/2030 --horario=14:30 --lembrar=true

Listar tarefas:
  /listar

Editar nome:
  /editar --id=UUID --novo-nome="Estudar TypeScript"

Editar data e horário:
  /editar --id=UUID --dia=16/11/2030 --horario=15:00

Ativar lembrete:
  /editar --id=UUID --lembrar=true

Desativar lembrete:
  /editar --id=UUID --lembrar=false

Excluir tarefa:
  /excluir --id=UUID

Exibir ajuda:
  /ajuda

Encerrar programa:
  /sair

Dica: utilize aspas para valores com espaços.
O lembrete é opcional e, por padrão, fica desativado.
`);
}

async function executeCommand(input: string): Promise<boolean> {
  if (!input.trim()) return false;

  const { command, args } = parseInput(input);

  switch (command) {
    case "criar":
      await createTask(args);
      break;

    case "listar":
      validateArgs(args, []);
      listTasks();
      break;

    case "editar":
      await editTask(args);
      break;

    case "excluir":
      await deleteTask(args);
      break;

    case "ajuda":
      validateArgs(args, []);
      showHelp();
      break;

    case "sair":
      validateArgs(args, []);
      return true;

    default:
      throw new Error(`Comando desconhecido: /${command}`);
  }

  return false;
}

async function main(): Promise<void> {
  try {
    tasks = await loadTasks();
  } catch (error) {
    console.error("\nErro ao carregar as tarefas:", error);

    process.exitCode = 1;
    rl.close();
    return;
  }

  for (const task of tasks) {
    scheduleReminder(task);
  }

  console.log("\nLista de tarefas iniciada!");
  showHelp();

  while (true) {
    let input: string;

    try {
      input = await rl.question("\nDigite seu comando: ");
    } catch {
      break;
    }

    try {
      const shouldExit = await executeCommand(input);

      if (shouldExit) break;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro desconhecido.";

      console.error(`\nErro: ${message}`);
    }
  }

  for (const timer of timers.values()) {
    clearTimeout(timer);
  }

  rl.close();

  console.log("\nPrograma encerrado.");
}

main().catch((error) => {
  console.error("Erro fatal:", error);
  process.exitCode = 1;
  rl.close();
});
