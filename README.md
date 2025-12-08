# 📊 Visualizador de Dados Google Sheets

Uma aplicação web moderna para visualizar dados de planilhas do Google Sheets em tempo real, com interface elegante e responsiva.

## ✨ Características

- 🔄 Sincronização automática com Google Sheets
- 🎨 Interface moderna com animações suaves
- 📱 Design responsivo (funciona em desktop e mobile)
- 🔍 Busca em tempo real
- 📊 Visualização em tabela ou cards
- 💾 Exportação para JSON
- 🖨️ Suporte para impressão
- ⚡ Atualização automática a cada 5 minutos

## 🚀 Configuração Rápida

### 1. Pré-requisitos

- Node.js 16+ instalado
- Conta Google
- Planilha configurada como pública ou API Key do Google

### 2. Instalação Local

```bash
# Clone ou baixe os arquivos
cd sheets-viewer

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
```

### 3. Configurar Google Sheets API

#### Opção A: Planilha Pública (Mais Simples)

1. Abra sua planilha no Google Sheets
2. Clique em **Compartilhar** > **Obter link**
3. Configure como **"Qualquer pessoa com o link pode visualizar"**
4. Acesse [Google Cloud Console](https://console.cloud.google.com)
5. Crie um novo projeto ou selecione um existente
6. Vá em **APIs e Serviços** > **Credenciais**
7. Clique em **+ CRIAR CREDENCIAIS** > **Chave de API**
8. Copie a API Key gerada
9. Vá em **APIs e Serviços** > **Biblioteca**
10. Procure por "Google Sheets API" e **ATIVE**

#### Opção B: Usando Service Account (Mais Seguro)

Para planilhas privadas, siga o guia detalhado na seção "Configuração Avançada" abaixo.

### 4. Configurar Variáveis de Ambiente

Edite o arquivo `.env`:

```env
GOOGLE_API_KEY=sua_api_key_aqui
PORT=3000
```

### 5. Executar Localmente

```bash
# Modo produção
npm start

# Modo desenvolvimento (com auto-reload)
npm run dev
```

Acesse: http://localhost:3000

## 🌐 Deploy Simples e Gratuito

### Opção 1: Deploy no Render (Recomendado - Grátis)

1. Crie uma conta em [render.com](https://render.com)
2. Conecte seu GitHub
3. Clique em **New** > **Web Service**
4. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Adicione a variável de ambiente `GOOGLE_API_KEY`
6. Deploy! URL será algo como: `https://seu-app.onrender.com`

### Opção 2: Deploy no Vercel

1. Instale Vercel CLI:
```bash
npm i -g vercel
```

2. Na pasta do projeto:
```bash
vercel
```

3. Siga as instruções e configure a variável `GOOGLE_API_KEY`

### Opção 3: Deploy no Heroku

1. Instale [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
2. Execute:

```bash
heroku create seu-app-nome
heroku config:set GOOGLE_API_KEY=sua_api_key
git push heroku main
```

### Opção 4: Deploy no Railway

1. Acesse [railway.app](https://railway.app)
2. Conecte com GitHub
3. Selecione o repositório
4. Configure a variável `GOOGLE_API_KEY`
5. Deploy automático!

## 🔒 Segurança

### Boas Práticas

1. **Nunca commite o arquivo `.env`** com suas credenciais
2. Use **HTTPS** em produção
3. Configure **CORS** adequadamente para seu domínio
4. Implemente **rate limiting** para APIs públicas
5. Use **Service Account** para dados sensíveis

### Configurar CORS para Produção

No arquivo `server.js`, ajuste o CORS:

```javascript
app.use(cors({
    origin: 'https://seu-dominio.com',
    credentials: true
}));
```

### Rate Limiting (Opcional)

```bash
npm install express-rate-limit
```

Adicione ao `server.js`:

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // limite de requisições
});

app.use('/api/', limiter);
```

## 🛠️ Configuração Avançada

### Usando Service Account (Para Planilhas Privadas)

1. No [Google Cloud Console](https://console.cloud.google.com):
   - Crie Service Account
   - Baixe o arquivo JSON de credenciais
   - Compartilhe a planilha com o email do Service Account

2. Modifique o `server.js`:

```javascript
const auth = new google.auth.GoogleAuth({
    keyFile: './credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });
```

### Personalização da Planilha

No `server.js`, ajuste o ID e range:

```javascript
const SPREADSHEET_ID = 'seu_id_aqui'; // ID da URL da planilha
const RANGE = 'Página1!A:Z'; // Ajuste conforme necessário
```

### Cache Redis (Para Alto Tráfego)

```bash
npm install redis
```

Implemente cache para melhor performance em produção.

## 📊 Estrutura do Projeto

```
sheets-viewer/
├── server.js           # Servidor Express principal
├── package.json        # Dependências do projeto
├── .env.example        # Exemplo de variáveis de ambiente
├── public/            
│   ├── index.html      # Interface principal
│   ├── styles.css      # Estilos com animações
│   └── script.js       # Lógica do frontend
└── README.md          # Este arquivo
```

## 🐛 Resolução de Problemas

### Erro: "API Key inválida"
- Verifique se a Google Sheets API está ativada
- Confirme se a API Key está correta no `.env`

### Erro: "Planilha não encontrada"
- Verifique o ID da planilha
- Confirme que a planilha está pública ou compartilhada

### Dados não aparecem
- Verifique o console do navegador (F12)
- Confirme que a primeira linha tem cabeçalhos
- Ajuste o `RANGE` no servidor se necessário

## 📝 Licença

MIT - Use livremente!

## 🤝 Suporte

Para dúvidas ou problemas:
1. Verifique a seção de problemas comuns
2. Consulte a [documentação da API do Google Sheets](https://developers.google.com/sheets/api)
3. Abra uma issue no GitHub

---

Desenvolvido com ❤️ usando Node.js e Google Sheets API