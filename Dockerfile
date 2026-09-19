# FreshHarvest Supermarket POS - Production Dockerfile
FROM nginx:alpine

LABEL maintainer="FreshHarvest Team" \
      description="Production Nginx server for FreshHarvest Supermarket Management & POS System" \
      version="2.0.0"

RUN rm -rf /usr/share/nginx/html/*
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
