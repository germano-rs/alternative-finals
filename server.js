require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;

const AUTH_PASSWORD = process.env.AUTH_PASSWORD || '123456@';
const AUTH_TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || crypto.randomBytes(32).toString('hex');

const activeTokens = new Set();

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function isValidToken(token) {
    return activeTokens.has(token);
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Você precisa fazer login para editar'
        });
    }
    
    if (!isValidToken(token)) {
        return res.status(401).json({
            success: false,
            error: 'Token inválido. Faça login novamente.'
        });
    }
    
    next();
}

app.use(helmet({
    contentSecurityPolicy: false
}));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuração da API do Google Sheets
const SPREADSHEET_ID = '1HdIWJt0fcZf_SFo16wawpkQ3NwiAnxs4fvkp9FYdZjQ';
const RANGE = 'A:Z'; // Ajuste conforme necessário

// Cache em memória para reduzir chamadas à API
let memoryCache = {
    data: null,
    timestamp: null,
    maxAge: 5000 // 5 segundos de cache em memória
};

// Cache para mapeamento de headers (evita processamento repetido)
let headerMappingCache = {
    headers: null,
    mapping: null
};

// Função para criar mapeamento otimizado de headers
function createHeaderMapping(headers) {
    if (!headers || headers.length === 0) {
        return null;
    }
    
    // Retorna cache se headers não mudaram
    if (headerMappingCache.headers === headers) {
        return headerMappingCache.mapping;
    }
    
    const mapping = {};
    headers.forEach((header, index) => {
        const headerLower = header ? header.toLowerCase().trim() : '';
        
        if (headerLower.includes('fase')) {
            mapping.fase = index;
        } else if (headerLower.includes('jogo') && !headerLower.includes('jogador')) {
            mapping.jogo = index;
        } else if (headerLower.includes('confronto')) {
            mapping.confronto = index;
        } else if (headerLower.includes('data') && !headerLower.includes('hora')) {
            mapping.data = index;
        } else if (headerLower.includes('dia')) {
            mapping.dia = index;
        } else if (headerLower.includes('horário') || headerLower.includes('horario')) {
            mapping.horario = index;
        } else if (headerLower.includes('quadra')) {
            mapping.quadra = index;
        } else if (headerLower.includes('placar') && headerLower.includes('vivo')) {
            mapping.placarVivo = index;
        }
    });
    
    // Atualiza cache
    headerMappingCache.headers = headers;
    headerMappingCache.mapping = mapping;
    
    return mapping;
}

// Função para inicializar autenticação
function initializeAuth() {
    if (process.env.GOOGLE_CREDENTIALS) {
        try {
            const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
            return new google.auth.GoogleAuth({
                credentials: credentials,
                scopes: ['https://www.googleapis.com/auth/spreadsheets']
            });
        } catch (error) {
            console.error('Erro ao parsear GOOGLE_CREDENTIALS:', error);
            return process.env.GOOGLE_API_KEY;
        }
    } else if (fs.existsSync(path.join(__dirname, 'credentials.json'))) {
        return new google.auth.GoogleAuth({
            keyFile: path.join(__dirname, 'credentials.json'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
    } else {
        console.log('Usando API Key (apenas leitura). Para escrita, configure Service Account.');
        return process.env.GOOGLE_API_KEY;
    }
}

const auth = initializeAuth();

// Função para obter dados da planilha
// Usa Service Account se credentials.json ou GOOGLE_CREDENTIALS estiverem configurados
// Caso contrário, usa API Key (apenas leitura)
async function getSheetData() {
    // Verifica cache em memória
    if (memoryCache.data && memoryCache.timestamp) {
        const age = Date.now() - memoryCache.timestamp;
        if (age < memoryCache.maxAge) {
            console.log('Retornando dados do cache em memória');
            return memoryCache.data;
        }
    }

    try {
        console.log('Buscando dados frescos da planilha...');
        const sheets = google.sheets({ 
            version: 'v4',
            auth: auth
        });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: RANGE
        });

        const rows = response.data.values;
        
        if (!rows || rows.length === 0) {
            return { headers: [], data: [] };
        }

        // Primeira linha como cabeçalhos
        const headers = rows[0];
        const data = rows.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = row[index] || '';
            });
            return obj;
        });

        const result = { headers, data };
        
        // Atualiza cache em memória
        memoryCache.data = result;
        memoryCache.timestamp = Date.now();
        
        return result;
    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        // Se houver erro, retorna cache se disponível
        if (memoryCache.data) {
            console.log('Erro na API, retornando cache anterior');
            return memoryCache.data;
        }
        throw error;
    }
}

// Rota API para obter dados da planilha
app.get('/api/data', async (req, res) => {
    try {
        const sheetData = await getSheetData();
        
        // SEM CACHE no navegador - sempre busca dados frescos
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        
        res.json({
            success: true,
            data: sheetData.data,
            headers: sheetData.headers,
            timestamp: new Date().toISOString(),
            cached: memoryCache.timestamp ? 
                (Date.now() - memoryCache.timestamp < memoryCache.maxAge) : false
        });
    } catch (error) {
        console.error('Erro na API:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao buscar dados da planilha',
            message: error.message
        });
    }
});

// Rota para limpar cache (útil para forçar atualização)
app.post('/api/clear-cache', (req, res) => {
    memoryCache.data = null;
    memoryCache.timestamp = null;
    res.json({ 
        success: true, 
        message: 'Cache limpo com sucesso' 
    });
});

// Rota para verificar status da API e cache
app.get('/api/health', (req, res) => {
    const cacheAge = memoryCache.timestamp ? 
        Math.floor((Date.now() - memoryCache.timestamp) / 1000) : null;
    
    res.json({ 
        status: 'online',
        timestamp: new Date().toISOString(),
        cache: {
            hasData: !!memoryCache.data,
            ageSeconds: cacheAge,
            maxAgeSeconds: memoryCache.maxAge / 1000
        }
    });
});

// Webhook para receber notificações de mudança (opcional)
app.post('/api/webhook', async (req, res) => {
    console.log('Webhook recebido - planilha atualizada:', req.body);
    
    // Limpa cache para forçar busca de dados novos
    memoryCache.data = null;
    memoryCache.timestamp = null;
    
    res.json({ 
        received: true,
        message: 'Cache limpo, próxima requisição buscará dados novos' 
    });
});

// Função para adicionar jogo na planilha
async function addGameToSheet(gameData) {
    try {
        const sheetData = await getSheetData();
        const headers = sheetData.headers;
        
        if (!headers || headers.length === 0) {
            throw new Error('Não foi possível obter os cabeçalhos da planilha');
        }

        const sheets = google.sheets({ 
            version: 'v4',
            auth: auth
        });

        // Usa mapeamento cacheado para melhor performance
        const mapping = createHeaderMapping(headers);
        const values = new Array(headers.length).fill('');
        
        if (mapping.fase !== undefined) values[mapping.fase] = gameData.fase || '';
        if (mapping.jogo !== undefined) values[mapping.jogo] = gameData.jogo || '';
        if (mapping.confronto !== undefined) values[mapping.confronto] = gameData.confronto || '';
        if (mapping.data !== undefined) values[mapping.data] = gameData.data || '';
        if (mapping.dia !== undefined) values[mapping.dia] = gameData.dia || '';
        if (mapping.horario !== undefined) values[mapping.horario] = gameData.horario || '';
        if (mapping.quadra !== undefined) values[mapping.quadra] = gameData.quadra || '';

        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'A:Z',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [values]
            }
        });

        memoryCache.data = null;
        memoryCache.timestamp = null;

        return {
            success: true,
            updatedCells: response.data.updates?.updatedCells || 0
        };
    } catch (error) {
        console.error('Erro ao adicionar jogo:', error);
        throw error;
    }
}

// Rota para autenticação
app.post('/api/auth', async (req, res) => {
    try {
        const { password } = req.body;
        
        if (password === AUTH_PASSWORD) {
            const token = generateToken();
            activeTokens.add(token);
            
            setTimeout(() => {
                activeTokens.delete(token);
            }, 24 * 60 * 60 * 1000);
            
            return res.json({
                success: true,
                token: token
            });
        } else {
            return res.status(401).json({
                success: false,
                error: 'Senha incorreta'
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: 'Erro ao autenticar'
        });
    }
});

// Rota para adicionar jogo
app.post('/api/add-game', authenticateToken, async (req, res) => {
    try {
        const { fase, jogo, confronto, data, dia, horario, quadra } = req.body;

        if (!fase || !jogo || !confronto || !data || !dia || !horario || !quadra) {
            return res.status(400).json({
                success: false,
                error: 'Todos os campos são obrigatórios'
            });
        }

        const gameData = {
            fase: String(fase).trim(),
            jogo: String(jogo).trim(),
            confronto: String(confronto).trim(),
            data: String(data).trim(),
            dia: String(dia).trim(),
            horario: String(horario).trim(),
            quadra: String(quadra).trim()
        };

        const result = await addGameToSheet(gameData);

        res.json({
            success: true,
            message: 'Jogo adicionado com sucesso',
            data: result
        });
    } catch (error) {
        console.error('Erro na API ao adicionar jogo:', error);
        
        let errorMessage = 'Erro ao adicionar jogo na planilha';
        
        if (error.code === 403) {
            errorMessage = 'Permissão negada. Verifique as credenciais da API.';
        } else if (error.code === 400) {
            errorMessage = 'Dados inválidos. Verifique os campos enviados.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        res.status(500).json({
            success: false,
            error: errorMessage,
            message: error.message
        });
    }
});

// Função para atualizar jogo na planilha
async function updateGameInSheet(rowIndex, gameData) {
    try {
        const sheetData = await getSheetData();
        const headers = sheetData.headers;
        
        if (!headers || headers.length === 0) {
            throw new Error('Não foi possível obter os cabeçalhos da planilha');
        }

        const sheets = google.sheets({ 
            version: 'v4',
            auth: auth
        });

        // Usa mapeamento cacheado para melhor performance
        const mapping = createHeaderMapping(headers);
        const values = new Array(headers.length).fill('');
        
        if (mapping.fase !== undefined) values[mapping.fase] = gameData.fase || '';
        if (mapping.jogo !== undefined) values[mapping.jogo] = gameData.jogo || '';
        if (mapping.confronto !== undefined) values[mapping.confronto] = gameData.confronto || '';
        if (mapping.data !== undefined) values[mapping.data] = gameData.data || '';
        if (mapping.dia !== undefined) values[mapping.dia] = gameData.dia || '';
        if (mapping.horario !== undefined) values[mapping.horario] = gameData.horario || '';
        if (mapping.quadra !== undefined) values[mapping.quadra] = gameData.quadra || '';
        if (mapping.placarVivo !== undefined) values[mapping.placarVivo] = gameData.placarVivo || '';

        const range = `${rowIndex}:${rowIndex}`;

        const response = await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [values]
            }
        });

        memoryCache.data = null;
        memoryCache.timestamp = null;

        return {
            success: true,
            updatedCells: response.data.updatedCells || 0
        };
    } catch (error) {
        console.error('Erro ao atualizar jogo:', error);
        throw error;
    }
}

// Rota para atualizar jogo
app.post('/api/update-game', authenticateToken, async (req, res) => {
    try {
        const { rowIndex, fase, jogo, confronto, data, dia, horario, quadra, placarVivo } = req.body;

        if (!rowIndex || !fase || !jogo || !confronto || !data || !dia || !horario || !quadra) {
            return res.status(400).json({
                success: false,
                error: 'Todos os campos são obrigatórios'
            });
        }

        const gameData = {
            fase: String(fase).trim(),
            jogo: String(jogo).trim(),
            confronto: String(confronto).trim(),
            data: String(data).trim(),
            dia: String(dia).trim(),
            horario: String(horario).trim(),
            quadra: String(quadra).trim(),
            placarVivo: placarVivo ? String(placarVivo).trim() : ''
        };

        const result = await updateGameInSheet(parseInt(rowIndex), gameData);

        res.json({
            success: true,
            message: 'Jogo atualizado com sucesso',
            data: result
        });
    } catch (error) {
        console.error('Erro na API ao atualizar jogo:', error);
        
        let errorMessage = 'Erro ao atualizar jogo na planilha';
        
        if (error.code === 403) {
            errorMessage = 'Permissão negada. Verifique as credenciais da API.';
        } else if (error.code === 400) {
            errorMessage = 'Dados inválidos. Verifique os campos enviados.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        res.status(500).json({
            success: false,
            error: errorMessage,
            message: error.message
        });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`
    🚀 Servidor rodando em http://localhost:${PORT}
    📊 API de dados: http://localhost:${PORT}/api/data
    ❤️  Health check: http://localhost:${PORT}/api/health
    🔄 Clear cache: POST http://localhost:${PORT}/api/clear-cache
    
    ⚡ Configurações de Performance:
    - Cache em memória: ${memoryCache.maxAge/1000}s
    - Cache HTTP: Desabilitado (tempo real)
    - Compressão: Ativada
    
    💡 Dica: Para atualização instantânea, configure
    o cliente para buscar a cada 10-30 segundos
    `);
});