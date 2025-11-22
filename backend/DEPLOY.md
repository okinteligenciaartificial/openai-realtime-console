# Guia de Deploy - Transition2English Backend

## Pré-requisitos

- Node.js 18+ instalado
- PostgreSQL 12+ instalado e rodando
- Acesso ao servidor de produção
- Variáveis de ambiente configuradas

## Passo 1: Preparar Ambiente

### 1.1 Clonar/Copiar código

```bash
# Se usando git
git clone <repository-url>
cd backend

# Ou copiar arquivos para o servidor
```

### 1.2 Instalar dependências

```bash
npm install --production
```

### 1.3 Configurar variáveis de ambiente

```bash
cp .env.example .env
# Editar .env com valores de produção
nano .env
```

**Variáveis obrigatórias para produção:**
- `NODE_ENV=production`
- `BACKEND_PORT=3001` (ou porta desejada)
- `DB_HOST` - Host do PostgreSQL
- `DB_PORT` - Porta do PostgreSQL (padrão: 5432)
- `DB_NAME` - Nome do banco de dados
- `DB_USER` - Usuário do banco
- `DB_PASSWORD` - Senha do banco
- `JWT_SECRET` - Chave secreta (mínimo 32 caracteres)
- `FRONTEND_URL` - URL do frontend (para CORS)

### 1.4 Validar configuração

```bash
npm run validate
```

## Passo 2: Configurar Banco de Dados

### 2.1 Criar banco de dados

```bash
# Conectar ao PostgreSQL
psql -U postgres

# Criar banco
CREATE DATABASE transition2english;

# Criar usuário (opcional)
CREATE USER transition2english_user WITH PASSWORD 'senha_segura';
GRANT ALL PRIVILEGES ON DATABASE transition2english TO transition2english_user;
```

### 2.2 Executar migrations

```bash
# Executar migrations do banco
npm run migrate
# Ou usar script de migrations existente
```

## Passo 3: Testar Localmente

### 3.1 Rodar testes

```bash
npm test
```

### 3.2 Testar servidor localmente

```bash
npm run dev
# Testar health check
curl http://localhost:3001/health
```

## Passo 4: Deploy com PM2 (Recomendado)

### 4.1 Instalar PM2 globalmente

```bash
npm install -g pm2
```

### 4.2 Criar arquivo de configuração PM2

Criar `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'transition2english-backend',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
    watch: false
  }]
};
```

### 4.3 Iniciar aplicação

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4.4 Comandos úteis PM2

```bash
# Ver status
pm2 status

# Ver logs
pm2 logs transition2english-backend

# Reiniciar
pm2 restart transition2english-backend

# Parar
pm2 stop transition2english-backend

# Monitorar
pm2 monit
```

## Passo 5: Configurar Nginx (Reverso Proxy)

### 5.1 Instalar Nginx

```bash
sudo apt update
sudo apt install nginx
```

### 5.2 Configurar Nginx

Criar `/etc/nginx/sites-available/transition2english-backend`:

```nginx
server {
    listen 80;
    server_name api.seudominio.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5.3 Ativar configuração

```bash
sudo ln -s /etc/nginx/sites-available/transition2english-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Passo 6: Configurar SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.seudominio.com
```

## Passo 7: Firewall

```bash
# Permitir porta 80 e 443
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Permitir porta do backend apenas localmente (via Nginx)
sudo ufw allow from 127.0.0.1 to any port 3001
```

## Passo 8: Monitoramento

### 8.1 Health Check

Configurar monitoramento para verificar `/health`:

```bash
# Exemplo de script de monitoramento
curl -f http://localhost:3001/health || echo "Backend is down!"
```

### 8.2 Logs

```bash
# Ver logs do PM2
pm2 logs transition2english-backend

# Ver logs do Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Passo 9: Backup

### 9.1 Backup do banco de dados

```bash
# Criar script de backup
pg_dump -U transition2english_user transition2english > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup
psql -U transition2english_user transition2english < backup_20240101_120000.sql
```

### 9.2 Automatizar backup

Criar crontab:

```bash
# Backup diário às 2h da manhã
0 2 * * * pg_dump -U transition2english_user transition2english > /backups/transition2english_$(date +\%Y\%m\%d).sql
```

## Troubleshooting

### Servidor não inicia

1. Verificar logs: `pm2 logs`
2. Verificar variáveis de ambiente: `npm run validate`
3. Verificar conexão com banco: `psql -U user -d database`

### Erro de conexão com banco

1. Verificar se PostgreSQL está rodando: `sudo systemctl status postgresql`
2. Verificar credenciais no `.env`
3. Verificar firewall e permissões

### Erro 502 Bad Gateway

1. Verificar se backend está rodando: `pm2 status`
2. Verificar logs do Nginx: `sudo tail -f /var/log/nginx/error.log`
3. Verificar configuração do Nginx

## Checklist de Deploy

- [ ] Código copiado para servidor
- [ ] Dependências instaladas (`npm install --production`)
- [ ] Variáveis de ambiente configuradas (`.env`)
- [ ] Validação passou (`npm run validate`)
- [ ] Banco de dados criado e migrations executadas
- [ ] Testes passaram (`npm test`)
- [ ] PM2 configurado e rodando
- [ ] Nginx configurado como reverse proxy
- [ ] SSL configurado (Let's Encrypt)
- [ ] Firewall configurado
- [ ] Monitoramento configurado
- [ ] Backup automatizado configurado
- [ ] Health check funcionando
- [ ] Logs sendo coletados

