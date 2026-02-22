# 🔒 Guia de Segurança - QuestForge

## 📋 Índice
1. [Arquitetura de Segurança](#arquitetura-de-segurança)
2. [Configuração de Firewall](#configuração-de-firewall)
3. [Portas e Exposição](#portas-e-exposição)
4. [Deploy em Produção](#deploy-em-produção)
5. [Checklist de Segurança](#checklist-de-segurança)

---

## 🏗️ Arquitetura de Segurança

### Fluxo de Requisições

```
Internet
   ↓
Porta 80 (Nginx) ← ÚNICA PORTA PÚBLICA
   ↓
   ├──→ Frontend (React) - Container Interno (porta 80 interna)
   │    └── Assets estáticos + SPA Routing
   │
   └──→ /api → Backend (Laravel) - Container Interno (porta 9000 interna)
        └── PostgreSQL - Container Interno (porta 5432 interna)
        └── Redis - Container Interno (porta 6379 interna)
```

### Princípios

✅ **Nginx como Gateway Único**: Todo o tráfego externo passa pelo Nginx  
✅ **Containers Isolados**: Backend, Frontend, DB e Redis não são acessíveis diretamente  
✅ **Banco de Dados Protegido**: PostgreSQL e Redis apenas na rede interna  
✅ **Sem Dev Server em Produção**: Frontend é buildado e servido como arquivos estáticos  

---

## 🛡️ Configuração de Firewall

### UFW (Ubuntu/Debian)

```bash
# Resetar firewall (cuidado!)
sudo ufw --force reset

# Política padrão: bloquear tudo
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Permitir SSH (CRÍTICO - não bloqueie antes de testar!)
sudo ufw allow 22/tcp comment 'SSH'

# Permitir HTTP (porta pública do Nginx)
sudo ufw allow 80/tcp comment 'HTTP'

# Permitir HTTPS (quando configurar SSL)
sudo ufw allow 443/tcp comment 'HTTPS'

# Ativar firewall
sudo ufw enable

# Verificar status
sudo ufw status verbose
```

### Firewalld (CentOS/RHEL)

```bash
# Adicionar regras
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https

# Reload
sudo firewall-cmd --reload

# Verificar
sudo firewall-cmd --list-all
```

### ⚠️ IMPORTANTE

- **Teste SSH antes de ativar o firewall!** Use `sudo ufw allow 22/tcp` primeiro
- Nunca bloqueie a porta 22 sem ter acesso alternativo ao servidor
- Se estiver usando um serviço de nuvem (DigitalOcean, AWS, etc), configure o firewall da cloud também

---

## 🔌 Portas e Exposição

### Portas Públicas (Expostas ao Host)

| Serviço | Porta Host | Porta Container | Acesso Externo |
|---------|------------|-----------------|----------------|
| Nginx   | 80         | 80              | ✅ SIM         |

### Portas Internas (Apenas Rede Docker)

| Serviço   | Porta Container | Acesso Externo |
|-----------|-----------------|----------------|
| Frontend  | 80              | ❌ NÃO         |
| Backend   | 9000            | ❌ NÃO         |
| PostgreSQL| 5432            | ❌ NÃO         |
| Redis     | 6379            | ❌ NÃO         |

### Verificar Portas Abertas

```bash
# Ver todas as portas em listening
sudo ss -tulpn | grep LISTEN

# Ver apenas containers Docker
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

---

## 🚀 Deploy em Produção

### 1. Configurar Variáveis de Ambiente

```bash
# Na raiz do projeto
cp .env.example .env
nano .env
```

**Arquivo `.env` (raiz):**
```bash
# Porta pública do Nginx
NGINX_PORT=80

# Banco de dados
DB_DATABASE=questforge
DB_USERNAME=questforge
DB_PASSWORD=SENHA_FORTE_AQUI  # ⚠️ MUDE ISSO!
DB_PORT=5432

# Redis
REDIS_PORT=6379
```

**Arquivo `backend/.env`:**
```bash
APP_ENV=production
APP_DEBUG=false  # ⚠️ NUNCA true em produção!
APP_KEY=  # Gerar com: php artisan key:generate

DB_CONNECTION=pgsql
DB_HOST=db
DB_PORT=5432
DB_DATABASE=questforge
DB_USERNAME=questforge
DB_PASSWORD=MESMA_SENHA_DO_OUTRO_ENV

CACHE_DRIVER=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

REDIS_HOST=redis
REDIS_PORT=6379
```

### 2. Build e Deploy

```bash
# Parar containers antigos (se existirem)
docker-compose down

# Build das imagens
docker-compose build --no-cache

# Subir em produção (modo daemon)
docker-compose up -d

# Verificar logs
docker-compose logs -f

# Rodar migrations (primeira vez)
docker-compose exec app php artisan migrate --force

# Otimizações Laravel
docker-compose exec app php artisan config:cache
docker-compose exec app php artisan route:cache
docker-compose exec app php artisan view:cache
```

### 3. Testar

```bash
# Deve retornar HTML do frontend
curl http://localhost

# Deve retornar JSON da API
curl http://localhost/api/health

# Verificar que portas 5173 e 9000 NÃO estão expostas
curl http://localhost:5173  # Deve falhar
curl http://localhost:9000  # Deve falhar
```

### 4. Configurar SSL (HTTPS) com Let's Encrypt

```bash
# Instalar Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Obter certificado (substitua seu domínio)
sudo certbot --nginx -d seudominio.com -d www.seudominio.com

# Renovação automática já está configurada
sudo certbot renew --dry-run
```

---

## ✅ Checklist de Segurança

### Antes do Deploy

- [ ] `APP_DEBUG=false` no `backend/.env`
- [ ] `APP_KEY` gerado e único
- [ ] Senha forte do PostgreSQL alterada
- [ ] `.env` e `backend/.env` não estão no Git (verificar `.gitignore`)
- [ ] Firewall configurado (apenas portas 22, 80, 443)
- [ ] Frontend buildado (não dev server)

### Após o Deploy

- [ ] Testar acesso via porta 80: `http://SEU_IP`
- [ ] Verificar que porta 5173 não responde
- [ ] Verificar que porta 9000 não responde
- [ ] Verificar logs: `docker-compose logs`
- [ ] Testar rotas da API: `curl http://SEU_IP/api/health`
- [ ] Configurar SSL com Let's Encrypt
- [ ] Configurar backups do PostgreSQL

### Manutenção Contínua

- [ ] Atualizar imagens Docker regularmente
- [ ] Monitorar logs de erro
- [ ] Configurar alertas de segurança
- [ ] Revisar acessos e permissões
- [ ] Fazer backup do banco de dados

---

## 🔍 Verificação de Segurança

### Teste de Portas Abertas (de fora do servidor)

```bash
# De outra máquina, teste:
nmap -p 22,80,443,5173,9000,5432,6379 SEU_IP_PUBLICO

# Resultado esperado:
# 22/tcp   open  ssh
# 80/tcp   open  http
# 443/tcp  open  https (se SSL configurado)
# 5173/tcp closed (ou filtered)
# 9000/tcp closed (ou filtered)
# 5432/tcp closed (ou filtered)
# 6379/tcp closed (ou filtered)
```

### Análise de Vulnerabilidades

```bash
# Escanear vulnerabilidades nas imagens Docker
docker scan questforge_app
docker scan questforge_frontend
docker scan questforge_nginx
```

---

## 📚 Referências

- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [Laravel Deployment](https://laravel.com/docs/deployment)
- [Nginx Security Guide](https://nginx.org/en/docs/http/ngx_http_ssl_module.html)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

## 🆘 Troubleshooting

### "Cannot connect to database"
- Verifique se o container `db` está rodando: `docker-compose ps`
- Verifique as credenciais em `backend/.env`
- Verifique os logs: `docker-compose logs db`

### "502 Bad Gateway"
- Container `app` ou `frontend` podem estar down
- Verifique: `docker-compose ps`
- Verifique logs: `docker-compose logs app frontend`

### "Connection refused" ao acessar pela porta 80
- Verifique se o Nginx está rodando: `docker-compose ps nginx`
- Verifique firewall: `sudo ufw status`
- Verifique se a porta está ouvindo: `sudo ss -tulpn | grep :80`

---

## 📞 Suporte

Em caso de problemas de segurança críticos, pare imediatamente a aplicação:

```bash
docker-compose down
```

E revise este guia antes de subir novamente.
