# Deploy – Casa em Dia

Arquivos usados no deploy em produção (EC2 + Nginx + HTTPS).

| Arquivo | Descrição |
|---------|-----------|
| `nginx-casaemdia.conf` | Nginx nas portas **8080** (HTTP) e **8443** (HTTPS), proxy para o app em 127.0.0.1:8080. Copie para `/etc/nginx/conf.d/` e ajuste o `server_name`. |

O passo a passo completo está em **[docs/DEPLOY-EC2.md](../docs/DEPLOY-EC2.md)**.
