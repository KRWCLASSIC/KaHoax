# Kahoax Website

This is nginx config i use for [KaHoax Website](https://kahoax.krwclassic.com):

```js
server {
    server_name kahoax.krwclassic.com;

    location / {
        proxy_pass https://kahoot.it;
        proxy_set_header Host kahoot.it;
        proxy_ssl_server_name on;
        proxy_set_header Accept-Encoding "";
        sub_filter_once off;
        sub_filter '</body>' '<script src="https://cdn.jsdelivr.net/gh/KRWCLASSIC/KaHoax@main/KaHoax.user.js"></script></body>';
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate ***hidden***; # managed by Certbot
    ssl_certificate_key ***hidden***; # managed by Certbot
    include ***hidden***; # managed by Certbot
    ssl_dhparam ***hidden***; # managed by Certbot

}
server {
    if ($host = kahoax.krwclassic.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    server_name kahoax.krwclassic.com;
    return 404; # managed by Certbot
}
```
