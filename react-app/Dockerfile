# react-app/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем исходники
COPY . .

# Сборка приложения
RUN npm run build

# Этап production с nginx
FROM nginx:alpine

# Копируем сборку в nginx
COPY --from=builder /app/build /usr/share/nginx/html

# Копируем конфиг nginx для SPA (поддержка роутинга)
RUN echo 'server { \
    listen 3000; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]