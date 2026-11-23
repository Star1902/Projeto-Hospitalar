const express = require("express");
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.use((req, res, next) => {
  if (req.path.startsWith("/")) res.setHeader("Cache-Control", "no-store");
  next();
});

// Configuração dos caminhos estáticos
let frontendPath = path.join(__dirname, "../frontend");
if (!fs.existsSync(frontendPath)) {
  frontendPath = fs.existsSync(path.join(__dirname, "public"))
    ? path.join(__dirname, "public")
    : path.join(__dirname, "../");
}

app.use(express.static(frontendPath));

app.get("/", (req, res) => {
  const indexPath = path.join(frontendPath, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send("API do Sistema Hospitalar está rodando!");
  }
});

// Banco de dados em memória
const db = {
  usuarios: [
    { usuario: "admin", senha: "123", tipo: "atendimento" },
    { usuario: "atendimento", senha: "123", tipo: "atendimento" },
    { usuario: "triagem", senha: "123", tipo: "triagem" },
    { usuario: "medico", senha: "123", tipo: "medico" }
  ],
  pacientes: [],
  triagens: [],
  consultas: [],
  tv_chamada: null,
  tv_historico: []
};

// LOGIN
app.post("/login", (req, res) => {
  const { usuario, senha } = req.body;
  const user = db.usuarios.find(u => u.usuario === usuario && u.senha === senha);

  if (!user) {
    return res.status(401).json({ erro: "Usuário ou senha inválidos." });
  }

  res.json({ usuario: user.usuario, tipo: user.tipo });
});

// ATENDIMENTO
app.post("/atendimento", (req, res) => {
  const { nome, dataNascimento } = req.body;
  if (typeof nome !== "string" || !nome.trim() || typeof dataNascimento !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dataNascimento)) {
    return res.status(400).json({ erro: "Informe nome e data de nascimento válidos." });
  }
  const paciente = {
    id: Date.now(),
    nome: nome.trim().slice(0, 140),
    cpf: String(req.body.cpf || "").slice(0, 20),
    dataNascimento,
    idade: Number.isInteger(req.body.idade) ? req.body.idade : null,
    responsavel: String(req.body.responsavel || "").slice(0, 140),
    tipo: String(req.body.tipo || "Geral").slice(0, 40),
    status: "triagem",
    createdAt: new Date()
  };

  db.pacientes.push(paciente);
  res.json(paciente);
});

app.get("/pacientes", (req, res) => {
  res.json(db.pacientes);
});

// TRIAGEM
app.post("/triagem", (req, res) => {
  try {
    const { pacienteId, nome, sintoma, temperatura, alergia, observacao, risco } = req.body;

    const prioridadesPermitidas = ["vermelho", "laranja", "amarelo", "verde", "azul"];
    if (!nome || !sintoma || !Number.isFinite(Number(temperatura)) || Number(temperatura) < 25 || Number(temperatura) > 45 || !prioridadesPermitidas.includes(risco)) {
      return res.status(400).json({ erro: "Dados de triagem inválidos. A prioridade deve ser registrada pelo profissional responsável." });
    }

    if (pacienteId) {
      const paciente = db.pacientes.find(p => String(p.id) === String(pacienteId));
      if (paciente) {
        paciente.status = "medico";
      }
    }

    const triagem = {
      id: Date.now(),
      pacienteId,
      nome,
      sintoma,
      temperatura: Number(temperatura),
      alergia: String(alergia || "").slice(0, 500),
      observacao: String(observacao || "").slice(0, 2000),
      risco,
      status: "aguardando_medico",
      createdAt: new Date()
    };

    db.triagens.push(triagem);
    res.json(triagem);
  } catch (error) {
    res.status(500).json({ erro: "Erro ao processar triagem." });
  }
});

app.get("/triagens", (req, res) => {
  res.json(db.triagens);
});

// TV - CHAMADAS
app.post("/tv/chamar", (req, res) => {
  const { localTipo, localNumero, paciente } = req.body;
  if (![localTipo, localNumero, paciente].every(v => typeof v === "string" && v.trim())) {
    return res.status(400).json({ erro: "Informe local, número e paciente para realizar a chamada." });
  }
  const chamada = {
    id: Date.now().toString(),
    localTipo: localTipo.trim().slice(0, 40),
    localNumero: localNumero.trim().slice(0, 12),
    paciente: paciente.trim().slice(0, 140),
    hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  };

  db.tv_chamada = chamada;
  db.tv_historico.unshift(chamada);
  if (db.tv_historico.length > 5) db.tv_historico.pop();

  res.json(chamada);
});

app.get("/tv/chamada", (req, res) => {
  res.json({
    chamada: db.tv_chamada,
    historico: db.tv_historico
  });
});

app.get("/lista-medicacoes", (req, res) => {
  res.json([
    "Dipirona", "Paracetamol", "Ibuprofeno", "Amoxicilina",
    "Azitromicina", "Loratadina", "Omeprazol", "Buscopan", "Dramin", "Soro fisiológico"
  ]);
});

// CONSULTA
app.post("/consulta", (req, res) => {
  const { triagemId, paciente, diagnostico, medicacao, obs } = req.body;
  if (![paciente, diagnostico, medicacao].every(v => typeof v === "string" && v.trim())) {
    return res.status(400).json({ erro: "Paciente, diagnóstico e medicação são obrigatórios." });
  }

  if (triagemId) {
    const triagem = db.triagens.find(t => String(t.id) === String(triagemId));
    if (triagem) {
      triagem.status = "finalizado";
    }
  }

  const consulta = {
    id: Date.now(),
    triagemId,
    paciente: paciente.trim().slice(0, 140),
    diagnostico: diagnostico.trim().slice(0, 2000),
    medicacao: medicacao.trim().slice(0, 500),
    obs: String(obs || "").slice(0, 3000),
    createdAt: new Date()
  };

  db.consultas.push(consulta);
  res.json(consulta);
});

app.get("/medicacoes", (req, res) => {
  res.json(db.consultas);
});

// GERAR PDF DA ALTA (USANDO PDFKIT VIA BUFFER)
app.post("/gerar-pdf-alta", (req, res) => {
  try {
    const { paciente, sintoma, temperatura, alergia, diagnostico, medicacao, obs } = req.body;
    const dataAtual = new Date().toLocaleDateString("pt-BR");

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    let buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Length", pdfData.length);
      res.setHeader("Content-Disposition", "inline; filename=alta_medica.pdf");
      res.status(200).send(pdfData);
    });

    // Conteúdo do PDF
    doc.fontSize(18).fillColor("#1a365d").text("🏥 HOSPITAL SENTINELA", { align: "left" });
    doc.fontSize(9).fillColor("#4a5568").text("Sistema de Gestão Hospitalar e Prontuário Eletrônico", { align: "left" });
    doc.fontSize(9).fillColor("#718096").text(`Data de Emissão: ${dataAtual}`, { align: "right" });
    doc.moveDown(1);

    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor("#2b6cb0").lineWidth(2).stroke();
    doc.moveDown(1.5);

    doc.fontSize(14).fillColor("#2b6cb0").text("TERMO DE ALTA MÉDICA", { align: "center" });
    doc.moveDown(1.5);

    doc.fontSize(11).fillColor("#1a365d").text("IDENTIFICAÇÃO DO PACIENTE");
    doc.fontSize(10).fillColor("#2d3748");
    doc.text(`Paciente: ${paciente || "Não informado"}`);
    doc.text(`Sintoma: ${sintoma || "—"}`);
    doc.text(`Temperatura: ${temperatura ? temperatura + " °C" : "—"}`);
    doc.text(`Alergias: ${alergia || "Nenhuma"}`);
    doc.moveDown(1.5);

    doc.fontSize(11).fillColor("#1a365d").text("DIAGNÓSTICO E CONDUTA MÉDICA");
    doc.fontSize(10).fillColor("#2d3748");
    doc.text(`Diagnóstico: ${diagnostico || "—"}`);
    doc.text(`Medicação Prescrita: ${medicacao || "Nenhuma"}`);
    doc.moveDown(1.5);

    doc.fontSize(11).fillColor("#1a365d").text("OBSERVAÇÕES E ORIENTAÇÕES");
    doc.fontSize(10).fillColor("#2d3748").text(obs || "Paciente liberado com orientações gerais de repouso.", { align: "justify" });
    doc.moveDown(4);

    const posY = doc.y;
    doc.moveTo(170, posY).lineTo(425, posY).strokeColor("#4a5568").lineWidth(1).stroke();
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#1a365d").text("Dr. Médico Responsável", { align: "center" });
    doc.fontSize(9).fillColor("#718096").text("CRM/UF 123456 • Medicina de Emergência", { align: "center" });

    doc.end();
  } catch (error) {
    console.error("Erro interno no PDF:", error);
    res.status(500).send("Erro interno ao processar PDF: " + error.message);
  }
});

app.get("/health", (req, res) => res.status(200).json({ status: "ok", service: "hospital-sentinela" }));

app.use((req, res) => res.status(404).json({ erro: "Rota não encontrada." }));
app.use((error, req, res, next) => {
  console.error("Falha na requisição:", error.message);
  if (res.headersSent) return next(error);
  res.status(error.status || 500).json({ erro: error.status === 413 ? "A requisição excede o limite permitido." : "Erro interno do servidor." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
