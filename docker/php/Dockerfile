FROM php:8.4-fpm-alpine

# ─── Dependências do sistema ──────────────────────────────────
RUN apk add --no-cache \
    bash \
    git \
    curl \
    zip \
    unzip \
    libpng-dev \
    libjpeg-turbo-dev \
    libpq-dev \
    postgresql-client \
    icu-dev \
    oniguruma-dev \
    libzip-dev

# ─── Extensões PHP necessárias para o Laravel ────────────────
RUN docker-php-ext-install \
    pdo \
    pdo_pgsql \
    pgsql \
    mbstring \
    exif \
    pcntl \
    bcmath \
    gd \
    zip \
    intl \
    opcache

# ─── Instalação do Redis para PHP ────────────────────────────
RUN apk add --no-cache --virtual .build-deps $PHPIZE_DEPS \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del .build-deps

# ─── Configuração OPcache ─────────────────────────────────────
RUN docker-php-ext-enable opcache

# ─── Instalação do Composer ───────────────────────────────────
COPY --from=composer:2.9 /usr/bin/composer /usr/bin/composer

# ─── Diretório de trabalho ────────────────────────────────────
WORKDIR /var/www/html

# ─── Usuário não-root para segurança ─────────────────────────
RUN addgroup -g 1000 www && adduser -u 1000 -G www -s /bin/bash -D www

# ─── Copia código e ajusta permissões ─────────────────────────
COPY --chown=www:www . .

# ─── Instala dependências sem extensões de dev desnecessárias
RUN composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev

RUN chown -R www:www /var/www/html/storage /var/www/html/bootstrap/cache

USER www

EXPOSE 9000
