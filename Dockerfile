FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY Lisons.html /usr/share/nginx/html/index.html
COPY Lisons.html /usr/share/nginx/html/Lisons.html
COPY styles.css   /usr/share/nginx/html/
COPY data.jsx     /usr/share/nginx/html/
COPY art.jsx      /usr/share/nginx/html/
COPY reader.jsx   /usr/share/nginx/html/
COPY app.jsx      /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
