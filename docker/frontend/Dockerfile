# ─── Multi-stage Build para Frontend React + Vite ─────────────

# ──────────────────────────────────────────────────────────────
# Stage 1: Build da aplicação
# ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copia os arquivos de dependências
COPY package*.json ./

# Instala as dependências
RUN npm ci --only=production=false

# Copia o código fonte
COPY . .

# Build de produção otimizado
RUN npm run build

# ──────────────────────────────────────────────────────────────
# Stage 2: Imagem final leve apenas com arquivos estáticos
# ──────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Remove configuração padrão do nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copia os arquivos buildados do stage anterior
COPY --from=builder /app/dist /usr/share/nginx/html

# Copia configuração customizada do nginx (será criada)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expõe porta 80 (interna do container)
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
