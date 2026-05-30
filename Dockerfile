FROM node:20-alpine AS frontend

WORKDIR /build

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL:-http://localhost:5000/api}

RUN npm run build

FROM php:8.5-fpm-alpine

RUN apk add --no-cache postgresql-dev \
    && docker-php-ext-install pdo_pgsql

WORKDIR /var/www

COPY --from=frontend /build/public/build ./public/build
COPY --from=frontend /build/resources ./resources

COPY artisan composer.json composer.lock ./
COPY app app/
COPY bootstrap bootstrap/
COPY config config/
COPY database database/
COPY routes routes/
COPY storage storage/
COPY public/index.php public/
COPY public/.htaccess public/
COPY public/favicon.ico public/
COPY public/robots.txt public/
COPY public/sw.js public/

RUN ln -s /var/www/storage/app/public /var/www/public/storage \
    && mkdir -p bootstrap/cache storage/framework/{cache,sessions,views} storage/logs \
    && chmod -R 775 storage bootstrap/cache

RUN set -eux \
    && apk add --no-cache curl \
    && curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer \
    && composer install --no-dev --optimize-autoloader --no-interaction \
    && apk del curl

RUN chown -R www-data:www-data storage bootstrap/cache

USER www-data

EXPOSE 9000

CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=9000"]
