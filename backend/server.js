const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_DIR = path.join(__dirname, "../frontend");

// No Render, configure DATA_DIR=/var/data para usar o disco persistente.
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DB_FILE = path.join(DATA_DIR, "db.json");
const SEED_DB_FILE = path.join(__dirname, "db.json");

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(FRONTEND_DIR));

function emptyDB() {
  return {
    usuarios: [], pacientes: [], triagens: [], consultas: [],
    tv_chamada: null, tv_historico: [], estoque: [], estoque_historico: []
  };
}

function ensureDB() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    let initial = emptyDB();
    if (fs.existsSync(SEED_DB_FILE)) {
      try { initial = { ...initial, ...JSON.parse(fs.readFileSync(SEED_DB_FILE, "utf8")) }; }
      catch (err) { console.error("Não foi possível ler o banco inicial:", err.message); }
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
  }
}

function readDB() {
  ensureDB();
  try {
    const db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    const defaults = emptyDB();
    for (const key of Object.keys(defaults)) {
      if (db[key] === undefined || db[key] === null) db[key] = defaults[key];
    }
    return db;
  } catch (err) {
    console.error("Erro ao ler banco de dados:", err);
    throw new Error("Não foi possível ler os dados do sistema.");
  }
}

function writeDB(db) {
  ensureDB();
  const tempFile = DB_FILE + ".tmp";
  fs.writeFileSync(tempFile, JSON.stringify(db, null, 2));
  fs.renameSync(tempFile, DB_FILE);
}

function nextId(items) {
  return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), Date.now() - 1) + 1;
}

// LOGIN
app.post("/login", (req, res) => {
  const db = readDB();
  const user = db.usuarios.find(u => u.usuario === req.body.usuario && u.senha === req.body.senha);
  if (!user) return res.status(401).json({ erro: "Login inválido" });
  res.json(user);
});

// USUÁRIOS (cadastro e administração)
app.get("/usuarios", (req, res) => {
  const db = readDB();
  res.json(db.usuarios.map(({ senha, ...user }) => user));
});
app.post("/usuarios", (req, res) => {
  const usuario = String(req.body.usuario || "").trim();
  const senha = String(req.body.senha || "").trim();
  const tipo = String(req.body.tipo || "").trim();
  if (!usuario || !senha || !tipo)
    return res.status(400).json({ erro: "Informe usuário, senha e setor." });
  const db = readDB();
  if (db.usuarios.some(u => u.usuario.toLowerCase() === usuario.toLowerCase()))
    return res.status(409).json({ erro: "Já existe um usuário com esse login." });
  const novo = { usuario, senha, tipo };
  if (req.body.nome) novo.nome = String(req.body.nome).trim();
  db.usuarios.push(novo); writeDB(db);
  const { senha: ignored, ...publicUser } = novo;
  res.status(201).json(publicUser);
});
app.delete("/usuarios/:login", (req, res) => {
  const db = readDB();
  const index = db.usuarios.findIndex(u => u.usuario === req.params.login);
  if (index < 0) return res.status(404).json({ erro: "Usuário não encontrado." });
  db.usuarios.splice(index, 1); writeDB(db);
  res.json({ mensagem: "Usuário removido." });
});

// ATENDIMENTO
app.post("/atendimento", (req, res) => {
  const db = readDB();
  const paciente = {
    id: nextId(db.pacientes), nome: req.body.nome, cpf: req.body.cpf,
    tipo: req.body.tipo, status: "triagem", createdAt: new Date().toISOString()
  };
  db.pacientes.push(paciente); writeDB(db); res.json(paciente);
});
app.get("/pacientes", (req, res) => res.json(readDB().pacientes));

// TRIAGEM
app.post("/triagem", (req, res) => {
  const db = readDB();
  let risco = req.body.risco;
  const temperatura = Number(req.body.temperatura);
  if (Number.isFinite(temperatura) && temperatura >= 39) risco = "vermelho";
  else if (Number.isFinite(temperatura) && temperatura >= 38) risco = "amarelo";
  else if (!risco) risco = "verde";
  const triagem = {
    id: nextId(db.triagens), nome: req.body.nome, sintoma: req.body.sintoma,
    temperatura: req.body.temperatura, alergia: req.body.alergia,
    observacao: req.body.observacao, risco, status: "aguardando_medico",
    createdAt: new Date().toISOString()
  };
  db.triagens.push(triagem); writeDB(db); res.json(triagem);
});
app.get("/triagens", (req, res) => res.json(readDB().triagens));

// CHAMADAS DA TV
app.post("/tv/chamar", (req, res) => {
  const db = readDB();
  const chamada = {
    id: String(Date.now()), localTipo: req.body.localTipo,
    localNumero: req.body.localNumero, paciente: req.body.paciente,
    hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  };
  db.tv_chamada = chamada;
  db.tv_historico.unshift(chamada);
  db.tv_historico = db.tv_historico.slice(0, 5);
  writeDB(db); res.json(chamada);
});
app.get("/tv/chamada", (req, res) => {
  const db = readDB();
  res.json({ chamada: db.tv_chamada, historico: db.tv_historico });
});

// MEDICAÇÕES E CONSULTAS
app.get("/lista-medicacoes", (req, res) => res.json([
  "Dipirona", "Paracetamol", "Ibuprofeno", "Amoxicilina", "Azitromicina",
  "Loratadina", "Omeprazol", "Buscopan", "Dramin", "Soro fisiológico"
]));
app.post("/consulta", (req, res) => {
  const db = readDB();
  const consulta = {
    id: nextId(db.consultas), paciente: req.body.paciente,
    diagnostico: req.body.diagnostico, medicacao: req.body.medicacao,
    obs: req.body.obs, createdAt: new Date().toISOString()
  };
  db.consultas.push(consulta); writeDB(db); res.json(consulta);
});
app.get("/medicacoes", (req, res) => res.json(readDB().consultas));

// ALMOXARIFADO / ESTOQUE
app.get("/estoque", (req, res) => {
  const db = readDB();
  res.json(db.estoque.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));
});

app.get("/estoque/historico", (req, res) => {
  const db = readDB();
  res.json(db.estoque_historico.slice(0, 50));
});

app.post("/estoque", (req, res) => {
  const nome = String(req.body.nome || "").trim();
  const quantidade = Number(req.body.quantidade);
  const unidade = String(req.body.unidade || "unidades").trim();
  const categoria = String(req.body.categoria || "Geral").trim();
  if (!nome) return res.status(400).json({ erro: "Informe o nome do medicamento." });
  if (!Number.isInteger(quantidade) || quantidade <= 0)
    return res.status(400).json({ erro: "A quantidade deve ser um número inteiro maior que zero." });

  const db = readDB();
  let medicamento = db.estoque.find(m => m.nome.toLocaleLowerCase("pt-BR") === nome.toLocaleLowerCase("pt-BR"));
  let tipo = "entrada";
  if (medicamento) {
    medicamento.quantidade = Number(medicamento.quantidade || 0) + quantidade;
    tipo = "reposicao";
  } else {
    medicamento = { id: nextId(db.estoque), nome, quantidade, unidade, categoria, createdAt: new Date().toISOString() };
    db.estoque.push(medicamento);
  }
  db.estoque_historico.unshift({
    id: Date.now(), tipo, nome: medicamento.nome, quantidade,
    unidade: medicamento.unidade, responsavel: String(req.body.responsavel || "Almoxarifado"),
    observacao: "", createdAt: new Date().toISOString()
  });
  writeDB(db);
  res.status(201).json({ mensagem: tipo === "entrada" ? "Medicamento cadastrado com sucesso." : "Estoque atualizado com sucesso.", medicamento });
});

app.patch("/estoque/:id", (req, res) => {
  const id = Number(req.params.id);
  const quantidade = Number(req.body.quantidade);
  if (!Number.isInteger(quantidade) || quantidade === 0)
    return res.status(400).json({ erro: "Informe uma quantidade inteira diferente de zero." });

  const db = readDB();
  const medicamento = db.estoque.find(m => Number(m.id) === id);
  if (!medicamento) return res.status(404).json({ erro: "Medicamento não encontrado." });
  const novoTotal = Number(medicamento.quantidade || 0) + quantidade;
  if (novoTotal < 0) return res.status(400).json({ erro: "A quantidade não pode deixar o estoque negativo." });

  medicamento.quantidade = novoTotal;
  db.estoque_historico.unshift({
    id: Date.now(), tipo: quantidade > 0 ? "reposicao" : "saida",
    nome: medicamento.nome, quantidade: Math.abs(quantidade),
    unidade: medicamento.unidade, responsavel: String(req.body.responsavel || "Almoxarifado"),
    observacao: String(req.body.observacao || ""), createdAt: new Date().toISOString()
  });
  writeDB(db);
  res.json({ mensagem: "Estoque atualizado com sucesso.", medicamento });
});

app.delete("/estoque/:id", (req, res) => {
  const db = readDB();
  const index = db.estoque.findIndex(m => Number(m.id) === Number(req.params.id));
  if (index === -1) return res.status(404).json({ erro: "Medicamento não encontrado." });
  const [removido] = db.estoque.splice(index, 1);
  writeDB(db);
  res.json({ mensagem: "Medicamento removido.", medicamento: removido });
});

// SPA / página inicial
app.get("/", (req, res) => res.sendFile(path.join(FRONTEND_DIR, "index.html")));

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ erro: "Erro interno do servidor." });
});

ensureDB();
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Hospital Sentinela disponível na porta ${PORT}`);
});
