require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const sql = require('mssql');
const multer = require('multer');
const { body, validationResult } = require('express-validator');

const app = express();
app.use(bodyParser.json({ limit: '25mb' }));

// For fetch API and other JSON requests
const path = require('path');

// For fetch API
const api = express.Router();

// For file uploads (multipart/form-data)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Database configuration from environment variables
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST || process.env.DB_SERVER || process.env.DB_SERVERNAME,
  database: process.env.DB_NAME,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true'
  }
};

// Serve static files (index.html and assets) from project root
app.use(express.static(path.join(__dirname)));

app.use('/forms-brasil', express.static(path.join(__dirname)));

// mount api router at both root and prefix so the front-end works under /forms-brasil
app.use('/api', api);
app.use('/forms-brasil/api', api);

// Explicit root route to ensure index is served
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Also serve the app under the /forms-brasil prefix (static files and SPA entry)

app.get('/forms-brasil', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/forms-brasil/*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// /api/submit - accept JSON (legacy) but avoid logging base64
api.post('/submit', async (req, res) => {
  try {
    const payload = req.body || {};
    const safeLog = Object.assign({}, payload);
    if (safeLog.comprovante_base64) safeLog.comprovante_base64 = '[BASE64_REMOVED]';
    try { console.log('Brazil JSON (sanitized):', JSON.stringify(safeLog, null, 2)); } catch (e) {}

    if (!dbConfig.server) return res.status(500).json({ success: false, error: 'DB not configured' });

    let comprovanteBuffer = null;
    if (payload.comprovante_base64) comprovanteBuffer = Buffer.from(payload.comprovante_base64, 'base64');

    const pool = await sql.connect(dbConfig);
    const request = pool.request()
      .input('Nome', sql.NVarChar(255), payload.nome || null)
      .input('Endereco', sql.NVarChar(400), payload.endereco || null)
      .input('Numero', sql.NVarChar(50), payload.Numero || payload.numero || null)
      .input('Complemento', sql.NVarChar(255), payload.complemento || null)
      .input('CEP', sql.NVarChar(50), payload.cep || null)
      .input('Bairro', sql.NVarChar(255), payload.bairro || null)
      .input('Cidade', sql.NVarChar(255), payload.cidade || null)
      .input('Estado', sql.NVarChar(100), payload.estado || null)
      .input('Telefone1', sql.NVarChar(50), payload.telefone1 || null)
      .input('Telefone2', sql.NVarChar(50), payload.telefone2 || null)
      .input('Pessoa_Contato', sql.NVarChar(255), payload.pessoa_contato || null)
      .input('Email_Fiscal', sql.NVarChar(255), payload.email_fiscal || null)
      .input('Email_Financeiro', sql.NVarChar(255), payload.email_financeiro || null)
      .input('Email_Responsavel', sql.NVarChar(255), payload.email_responsavel || null)
      .input('Banco', sql.NVarChar(200), payload.banco || null)
      .input('Agencia', sql.NVarChar(100), payload.agencia || null)
      .input('Conta', sql.NVarChar(100), payload.conta || null)
      .input('Comprovante_Filename', sql.NVarChar(255), payload.comprovante_filename || null)
      .input('Comprovante_Data', sql.VarBinary(sql.MAX), comprovanteBuffer)
      .input('CNPJ', sql.NVarChar(50), payload.cnpj || null)
      .input('Inscricao_Estadual', sql.NVarChar(100), payload.inscricao_estadual || null)
      .input('Inscricao_Municipal', sql.NVarChar(100), payload.inscricao_municipal || null)
      .input('CNAE', sql.NVarChar(100), payload.cnae || null)
      .input('PIS_COFINS', sql.NVarChar(50), payload.pis_cofins || null)
      .input('Regime_Tributario', sql.NVarChar(50), payload.regime_tributario || null)
      .input('Faixa_Faturamento', sql.NVarChar(100), payload.faixa_faturamento || null)
      .input('IRRF', sql.Bit, payload.irrf ? 1 : 0)
      .input('CSLL', sql.Bit, payload.csll ? 1 : 0)
      .input('PIS', sql.Bit, payload.pis ? 1 : 0)
      .input('COFINS', sql.Bit, payload.cofins ? 1 : 0)
      .input('INSS', sql.Bit, payload.inss ? 1 : 0)
      .input('ISS', sql.Bit, payload.iss ? 1 : 0)
      .input('Contribuicoes', sql.Bit, payload.contribuicoes ? 1 : 0)
      .input('CPF', sql.NVarChar(50), payload.cpf || null)
      .input('Dependentes', sql.NVarChar(20), payload.dependentes || null);

    const insertSql = `
      INSERT INTO RPA_PROJ_FINANCE_EXCELLENCE.dbo.RPA_487_Submissoes_BRA
      (Nome, Endereco, Numero, Complemento, CEP, Bairro, Cidade, Estado,
  Telefone1, Telefone2, Pessoa_Contato,
       Email_Fiscal, Email_Financeiro, Email_Responsavel,
       Banco, Agencia, Conta, Comprovante_Filename, Comprovante_Data,
       CNPJ, Inscricao_Estadual, Inscricao_Municipal, CNAE,
       PIS_COFINS, Regime_Tributario, Faixa_Faturamento,
       IRRF, CSLL, PIS, COFINS, INSS, ISS, Contribuicoes,
       CPF, Dependentes)
      VALUES
      (@Nome, @Endereco, @Numero, @Complemento, @CEP, @Bairro, @Cidade, @Estado,
  @Telefone1, @Telefone2, @Pessoa_Contato,
       @Email_Fiscal, @Email_Financeiro, @Email_Responsavel,
       @Banco, @Agencia, @Conta, @Comprovante_Filename, @Comprovante_Data,
       @CNPJ, @Inscricao_Estadual, @Inscricao_Municipal, @CNAE,
       @PIS_COFINS, @Regime_Tributario, @Faixa_Faturamento,
       @IRRF, @CSLL, @PIS, @COFINS, @INSS, @ISS, @Contribuicoes,
       @CPF, @Dependentes);
    `;

    await request.query(insertSql);
    res.json({ success: true });
  } catch (err) {
    console.error('submit error (brasil)', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

api.post('/submit-multipart',
  upload.single('comprovante_bancario'),
  body('nome').notEmpty().withMessage('nome is required'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

      const payload = req.body || {};
      let comprovanteBuffer = null;
      let comprovanteFilename = null;
      if (req.file && req.file.buffer) {
        comprovanteBuffer = req.file.buffer;
        comprovanteFilename = req.file.originalname;
      }

      if (!payload.nome) return res.status(400).json({ success: false, error: 'nome é obrigatório' });
      if (!payload.cnpj && !payload.cpf) return res.status(400).json({ success: false, error: 'cnpj ou cpf obrigatório' });
      if (!dbConfig.server) return res.status(500).json({ success: false, error: 'DB not configured' });

      const pool = await sql.connect(dbConfig);
      const request = pool.request()
        .input('Nome', sql.NVarChar(255), payload.nome || null)
        .input('Endereco', sql.NVarChar(400), payload.endereco || null)
        .input('Numero', sql.NVarChar(50), payload.Numero || payload.numero || null)
        .input('Complemento', sql.NVarChar(255), payload.complemento || null)
        .input('CEP', sql.NVarChar(50), payload.cep || null)
        .input('Bairro', sql.NVarChar(255), payload.bairro || null)
        .input('Cidade', sql.NVarChar(255), payload.cidade || null)
        .input('Estado', sql.NVarChar(100), payload.estado || null)
        .input('Telefone1', sql.NVarChar(50), payload.telefone1 || null)
        .input('Telefone2', sql.NVarChar(50), payload.telefone2 || null)
        .input('Pessoa_Contato', sql.NVarChar(255), payload.pessoa_contato || null)
        .input('Email_Fiscal', sql.NVarChar(255), payload.email_fiscal || null)
        .input('Email_Financeiro', sql.NVarChar(255), payload.email_financeiro || null)
        .input('Email_Responsavel', sql.NVarChar(255), payload.email_responsavel || null)
        .input('Banco', sql.NVarChar(200), payload.banco || null)
        .input('Agencia', sql.NVarChar(100), payload.agencia || null)
        .input('Conta', sql.NVarChar(100), payload.conta || null)
        .input('Comprovante_Filename', sql.NVarChar(255), comprovanteFilename || payload.comprovante_filename || null)
        .input('Comprovante_Data', sql.VarBinary(sql.MAX), comprovanteBuffer)
        .input('CNPJ', sql.NVarChar(50), payload.cnpj || null)
        .input('Inscricao_Estadual', sql.NVarChar(100), payload.inscricao_estadual || null)
        .input('Inscricao_Municipal', sql.NVarChar(100), payload.inscricao_municipal || null)
        .input('CNAE', sql.NVarChar(100), payload.cnae || null)
        .input('PIS_COFINS', sql.NVarChar(50), payload.pis_cofins || null)
        .input('Regime_Tributario', sql.NVarChar(50), payload.regime_tributario || null)
        .input('Faixa_Faturamento', sql.NVarChar(100), payload.faixa_faturamento || null)
        .input('IRRF', sql.Bit, payload.irrf ? 1 : 0)
        .input('CSLL', sql.Bit, payload.csll ? 1 : 0)
        .input('PIS', sql.Bit, payload.pis ? 1 : 0)
        .input('COFINS', sql.Bit, payload.cofins ? 1 : 0)
        .input('INSS', sql.Bit, payload.inss ? 1 : 0)
        .input('ISS', sql.Bit, payload.iss ? 1 : 0)
        .input('Contribuicoes', sql.Bit, payload.contribuicoes ? 1 : 0)
        .input('CPF', sql.NVarChar(50), payload.cpf || null)
        .input('Dependentes', sql.NVarChar(20), payload.dependentes || null);

      const insertSql = `
      INSERT INTO RPA_PROJ_FINANCE_EXCELLENCE.dbo.RPA_487_Submissoes_BRA
      (Nome, Endereco, Numero, Complemento, CEP, Bairro, Cidade, Estado,
  Telefone1, Telefone2, Pessoa_Contato,
       Email_Fiscal, Email_Financeiro, Email_Responsavel,
       Banco, Agencia, Conta, Comprovante_Filename, Comprovante_Data,
       CNPJ, Inscricao_Estadual, Inscricao_Municipal, CNAE,
       PIS_COFINS, Regime_Tributario, Faixa_Faturamento,
       IRRF, CSLL, PIS, COFINS, INSS, ISS, Contribuicoes,
       CPF, Dependentes)
      VALUES
      (@Nome, @Endereco, @Numero, @Complemento, @CEP, @Bairro, @Cidade, @Estado,
  @Telefone1, @Telefone2, @Pessoa_Contato,
       @Email_Fiscal, @Email_Financeiro, @Email_Responsavel,
       @Banco, @Agencia, @Conta, @Comprovante_Filename, @Comprovante_Data,
       @CNPJ, @Inscricao_Estadual, @Inscricao_Municipal, @CNAE,
       @PIS_COFINS, @Regime_Tributario, @Faixa_Faturamento,
       @IRRF, @CSLL, @PIS, @COFINS, @INSS, @ISS, @Contribuicoes,
       @CPF, @Dependentes);
    `;

      await request.query(insertSql);
      res.json({ success: true });
    } catch (err) {
      console.error('submit-multipart error (brasil)', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

// Sintegra proxy
api.get('/sintegra', async (req, res) => {
  try {
    const raw = req.query.cnpj || '';
    const cnpj = raw.replace(/\D/g, '');
    if (!cnpj) return res.status(400).json({ error: 'cnpj query parameter required' });
    const token = process.env.SINTEGRA_TOKEN;
    if (!token) return res.status(500).json({ error: 'Sintegra token not configured' });
    const url = `https://www.sintegraws.com.br/api/v1/execute-api.php?token=${token}&cnpj=${cnpj}&plugin=RF`;
    const resp = await fetch(url);
    if (!resp.ok) return res.status(502).json({ error: 'Sintegra service returned error', status: resp.status });
    const json = await resp.json();
    const mapped = {
      logradouro: json.logradouro || json.address || null,
      numero: json.numero || json.number || null,
      complemento: json.complemento || json.complement || null,
      bairro: json.bairro || null,
      municipio: json.municipio || json.city || json.localidade || null,
      uf: json.uf || json.estado || null,
      atividade_principal: json.atividade_principal || json.atividades_principais || null
    };
    return res.json(mapped);
  } catch (err) {
    console.error('sintegra proxy error (brasil)', err);
    return res.status(500).json({ error: err.message });
  }
});

// ViaCEP proxy
api.get('/cep', async (req, res) => {
  try {
    const raw = req.query.cep || '';
    const cep = (raw || '').toString().replace(/\D/g, '');
    if (!cep || cep.length !== 8) return res.status(400).json({ error: 'cep query parameter required and must be 8 digits' });
    const url = `https://viacep.com.br/ws/${cep}/json/`;
    const resp = await fetch(url);
    if (!resp.ok) return res.status(502).json({ error: 'ViaCEP returned error', status: resp.status });
    const json = await resp.json();
    if (json.erro) return res.status(404).json({ error: 'CEP not found' });
    const mapped = {
      logradouro: json.logradouro || null,
      complemento: json.complemento || null,
      bairro: json.bairro || null,
      localidade: json.localidade || null,
      uf: json.uf || null
    };
    return res.json(mapped);
  } catch (err) {
    console.error('cep proxy error (brasil)', err);
    return res.status(500).json({ error: err.message });
  }
});

// Bancos list
api.get('/bancos', async (req, res) => {
  try {
    if (!dbConfig.server) return res.status(500).json({ error: 'DB not configured' });
    const pool = await sql.connect(dbConfig);
    const result = await pool.request().query(`SELECT Numero_Banco, Chave_Banco, Nome_Instituicao FROM RPA_487_Lista_bancos ORDER BY Numero_Banco`);
    const rows = (result && result.recordset) ? result.recordset : [];
    const mapped = rows.map(r => ({ numero: r.Numero_Banco, chave: r.Chave_Banco, nome: r.Nome_Instituicao }));
    return res.json(mapped);
  } catch (err) {
    console.error('bancos list error (brasil)', err);
    return res.status(500).json({ error: 'Erro ao obter lista de bancos' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => 
  console.log(`Brasil backend listening on ${port}`)
);
