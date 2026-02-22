# 🚀 Guia de Migração para Nova Arquitetura

## 📋 O que mudou?

### ANTES (Arquitetura Antiga - INSEGURA)
```
Internet → Porta 5173 (Frontend Dev Server) ❌ EXPOSTO
Internet → Porta 8000 (Nginx → Backend)
```

### DEPOIS (Arquitetura Nova - SEGURA)
```
Internet → Porta 80 (Nginx) → Frontend OU Backend
                              ↓
                    Containers Internos
```

---

## ⚠️ STATUS ATUAL DO SEU SERVIDOR

Se você está acessando **http://206.189.171.189:5173/** em produção, você está:

❌ Rodando dev server do Vite (não otimizado)  
❌ Expondo o frontend diretamente (sem segurança)  
❌ Não usando o Nginx corretamente  
❌ Perdendo performance e cache  

---

## 🔧 Como Migrar (Passo a Passo)

### 1. Backup (IMPORTANTE!)

```bash
# No seu servidor VPS
cd /caminho/para/questforge

# Backup do banco de dados
docker-compose exec db pg_dump -U questforge questforge > backup_$(date +%Y%m%d).sql

# Backup das variáveis de ambiente
cp .env .env.backup
cp backend/.env backend/.env.backup
```

### 2. Atualizar o Código

```bash
# No seu servidor VPS
cd /caminho/para/questforge

# Fazer backup das alterações locais (se houver)
git stash

# Atualizar para a versão nova
git pull origin main

# Restaurar alterações se necessário
git stash pop
```

### 3. Atualizar Variáveis de Ambiente

```bash
# Editar .env na raiz
nano .env
```

**Modificar:**
```bash
# ANTES:
NGINX_PORT=8000
FRONTEND_PORT=5173

# DEPOIS:
NGINX_PORT=80
# Remover FRONTEND_PORT (não é mais necessário)
```

**Se não existir `.env` na raiz:**
```bash
cp .env.example .env
nano .env  # Configurar NGINX_PORT=80
```

### 4. Parar Containers Antigos

```bash
docker-compose down
```

### 5. Rebuild e Deploy

```bash
# Rebuild das imagens (forçar sem cache)
docker-compose build --no-cache

# Subir a nova arquitetura
docker-compose up -d

# Verificar se subiram corretamente
docker-compose ps
```

### 6. Verificar Logs

```bash
# Ver logs de todos os serviços
docker-compose logs -f

# Ver logs específicos
docker-compose logs -f nginx
docker-compose logs -f frontend
docker-compose logs -f app
```

### 7. Configurar Firewall

```bash
# Remover regras antigas se existirem
sudo ufw delete allow 5173/tcp
sudo ufw delete allow 8000/tcp

# Configurar apenas portas necessárias
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# Bloquear tudo mais
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Ativar
sudo ufw enable

# Verificar
sudo ufw status verbose
```

### 8. Testar a Aplicação

```bash
# De fora do servidor (sua máquina local)
curl http://206.189.171.189/

# Verificar que frontend responde
curl -I http://206.189.171.189/

# Verificar que API responde
curl http://206.189.171.189/api/health

# Verificar que portas antigas NÃO respondem (deve dar erro)
curl http://206.189.171.189:5173/  # ❌ Deve falhar
curl http://206.189.171.189:8000/  # ❌ Deve falhar
```

### 9. Atualizar URLs no Frontend

Se você tiver URLs hardcoded no código do frontend, atualize:

```javascript
// ANTES:
const API_URL = 'http://206.189.171.189:8000/api'

// DEPOIS:
const API_URL = '/api'  // Caminho relativo
```

---

## ✅ Checklist Pós-Migração

- [ ] Aplicação acessível em `http://206.189.171.189/` (sem porta)
- [ ] API responde em `http://206.189.171.189/api/...`
- [ ] Porta 5173 **não responde** externamente
- [ ] Porta 8000 **não responde** externamente
- [ ] Firewall configurado (apenas 22, 80, 443)
- [ ] Logs sem erros: `docker-compose logs`
- [ ] Frontend carrega rapidamente (build otimizado)

---

## 🆘 Problemas Comuns

### "502 Bad Gateway"

```bash
# Verificar status dos containers
docker-compose ps

# Se algum estiver down, ver os logs
docker-compose logs frontend
docker-compose logs app

# Restart se necessário
docker-compose restart
```

### "Cannot connect to API"

Verifique se as URLs no frontend estão corretas. Deve ser `/api` (caminho relativo), não `http://localhost:8000/api`.

### Porta 80 já está em uso

```bash
# Ver o que está usando a porta 80
sudo ss -tulpn | grep :80

# Se for Apache ou outro servidor, pare:
sudo systemctl stop apache2  # ou nginx, ou outro
sudo systemctl disable apache2
```

### Containers não sobem

```bash
# Ver logs detalhados
docker-compose logs -f

# Rebuild forçado
docker-compose down -v  # ⚠️ Isso apaga volumes!
docker-compose build --no-cache
docker-compose up -d
```

---

## 🔄 Rollback (Se algo der errado)

```bash
# Voltar para a versão anterior
git log  # Ver commits
git checkout HASH_DO_COMMIT_ANTERIOR

# Restaurar .env
cp .env.backup .env
cp backend/.env.backup backend/.env

# Rebuild
docker-compose down
docker-compose up -d --build

# Restaurar banco (se necessário)
docker-compose exec -T db psql -U questforge questforge < backup_YYYYMMDD.sql
```

---

## 📞 Suporte

Se encontrar problemas, verifique:

1. [docs/SECURITY.md](./SECURITY.md) - Guia completo de segurança
2. [README.md](../README.md) - Documentação principal
3. Logs: `docker-compose logs -f`

---

## 🎉 Próximos Passos (Opcional)

### Configurar HTTPS com Let's Encrypt

```bash
# Instalar Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d seudominio.com

# Renovação automática já está configurada
```

### Configurar Backups Automáticos

```bash
# Criar script de backup
nano /usr/local/bin/backup-questforge.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/backups/questforge"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

cd /caminho/para/questforge
docker-compose exec -T db pg_dump -U questforge questforge > "$BACKUP_DIR/db_$DATE.sql"

# Manter apenas últimos 7 dias
find $BACKUP_DIR -name "db_*.sql" -mtime +7 -delete
```

```bash
# Tornar executável
chmod +x /usr/local/bin/backup-questforge.sh

# Adicionar ao cron (diariamente às 2h)
crontab -e
# Adicionar linha:
0 2 * * * /usr/local/bin/backup-questforge.sh
```

---

**Boa migração! 🚀**
