# Deploy Casa em Dia no EC2 (Nginx + HTTPS)

Este guia descreve o deploy da aplicação em uma instância **Amazon Linux 2** ou **Ubuntu** na AWS, com **Nginx** como proxy reverso e **HTTPS** via **Let's Encrypt** (Certbot).

O app usa as portas **8080 (HTTP)** e **8443 (HTTPS)** para não conflitar com outro serviço já rodando em 80/443 no Linux.

## Visão geral

```
Internet → Nginx (8080/8443) → Docker: frontend (localhost:8080) + backend (3000)
                                    ↓
                               PostgreSQL (interno)
```

- **Nginx** no host: escuta em **8080** (HTTP) e **8443** (HTTPS), termina SSL e encaminha para o container do frontend.
- **Frontend** (container): escuta em `127.0.0.1:8081` no host; o Nginx faz proxy de 8080/8443 para ele.
- **Backend** e **PostgreSQL** não são expostos externamente.

---

## 1. Pré-requisitos

- Instância EC2 (ex.: **t3.small**) com **Amazon Linux 2** ou **Ubuntu 22.04**.
- **Domínio** apontando para o IP público da EC2 (registro A ou CNAME).
- Portas **8080** (HTTP) e **8443** (HTTPS) liberadas no Security Group da EC2 (evita conflito com serviço em 80/443).
- Acesso SSH à instância.

---

## 2. Preparar a instância

### 2.1 Conectar via SSH

```bash
ssh -i sua-chave.pem ec2-user@SEU_IP_PUBLICO
# Ubuntu: ssh -i sua-chave.pem ubuntu@SEU_IP_PUBLICO
```

### 2.2 Instalar Docker e Docker Compose (Amazon Linux 2)

```bash
sudo yum update -y
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user
# Sair e entrar de novo para aplicar o grupo

sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2.3 Instalar Docker (Ubuntu 22.04)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu
# Sair e entrar de novo
```

---

## 3. Instalar Nginx e Certbot

### Amazon Linux 2

```bash
sudo yum install -y nginx
sudo amazon-linux-extras install -y epel
sudo yum install -y certbot python3-certbot-nginx
sudo systemctl enable nginx
```

### Ubuntu 22.04

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo systemctl enable nginx
```

---

## 4. Clonar o projeto e configurar ambiente

```bash
# Em um diretório de sua escolha (ex.: home do usuário)
cd ~
git clone https://github.com/guihgalli/CasaEmDia.git casaemdia
cd casaemdia
```

Criar o arquivo `.env` a partir do exemplo:

```bash
cp .env.example .env
nano .env   # ou vim
```

Preencha com valores de produção (senhas fortes, secrets únicos). Use a URL com a porta **8443** (HTTPS) ou **8080** (HTTP) conforme o acesso:

```env
POSTGRES_PASSWORD=senha_muito_forte_postgres
JWT_SECRET=um_texto_longo_aleatorio_para_jwt
JWT_REFRESH_SECRET=outro_texto_longo_aleatorio_refresh
# Com HTTPS na porta 8443 (ou só HTTP na 8080 se não usar Certbot)
FRONTEND_URL=https://seu-dominio.com.br:8443
```

Para o deploy com Nginx no host, o frontend será acessado via proxy; não é necessário definir `VITE_API_URL` no `.env` (o app usa caminho relativo `/api`).

---

## 5. Subir a aplicação (porta interna 8081)

O container do frontend expõe a porta **8081** em localhost (evita conflito se a 8080 já estiver em uso); o Nginx do host escuta em **8080** e **8443** e faz proxy para o container. Use **sempre os dois arquivos** (o `.prod.yml` é só override; sozinho dá erro "service has neither image nor build"):

```bash
# Na raiz do projeto (obrigatório: -f docker-compose.yml -f docker-compose.prod.yml)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Isso sobe:

- **PostgreSQL** (apenas rede interna)
- **Backend** (apenas rede interna, porta 3000). Na inicialização o backend executa **`prisma migrate deploy`** automaticamente; não é necessário rodar migrações à mão.
- **Frontend** em **localhost:8081** (Nginx em 8080/8443 faz proxy para ele)

Verifique:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080
# Deve retornar 200
```

---

## 6. Configurar Nginx no host

### 6.1 Copiar o arquivo de configuração

O projeto inclui um modelo em `deploy/nginx-casaemdia.conf`. Copie para o Nginx (ajuste o caminho se tiver clonado em outro lugar):

```bash
sudo cp ~/casaemdia/deploy/nginx-casaemdia.conf /etc/nginx/conf.d/casaemdia.conf
```

### 6.2 Ajustar o domínio

Edite o arquivo e troque `seu-dominio.com.br` pelo seu domínio:

```bash
sudo nano /etc/nginx/conf.d/casaemdia.conf
# Substitua seu-dominio.com.br em server_name
```

### 6.3 Testar e recarregar Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

O site deve abrir em **HTTP** em **http://seu-dominio.com.br:8080** (ou pelo IP da EC2:8080).

---

## 7. Obter certificado HTTPS (Let's Encrypt)

Como o Nginx do Casa em Dia usa as portas **8080** e **8443**, o Certbot precisa validar na 8080. Use:

```bash
sudo certbot --nginx -d seu-dominio.com.br --http-01-port 8080
```

Se o Certbot configurar automaticamente a porta 443, edite o arquivo em `/etc/letsencrypt/renewal/seu-dominio.com.br.conf` ou o vhost do Nginx e altere `listen 443` para `listen 8443` (e o redirect de 8080 para `https://...:8443`).

Ou obtenha o certificado em modo standalone na 8080 (pare o Nginx momentaneamente se precisar):

```bash
sudo certbot certonly --standalone -d seu-dominio.com.br --preferred-challenges http --http-01-port 8080
```

Depois ajuste manualmente o bloco `server { listen 8443 ssl; ... }` no `deploy/nginx-casaemdia.conf`, descomente e aponte para os certificados em `/etc/letsencrypt/live/seu-dominio.com.br/`.

Renovação automática:

```bash
sudo certbot renew --dry-run
```

---

## 8. Ajustar CORS no backend

No `.env` da aplicação, use a URL do frontend com a porta **8443** (HTTPS) ou **8080** (HTTP):

```env
FRONTEND_URL=https://seu-dominio.com.br:8443
```

Reinicie os containers para carregar a variável:

```bash
cd ~/casaemdia
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## 9. Manutenção

### Ver logs

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
# Ou por serviço:
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f backend
```

### Atualizar a aplicação

```bash
cd ~/casaemdia
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### Reiniciar apenas um serviço

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart backend
```

### Erro 502 ou "Host is unreachable" ao fazer login/chamar API

Se o Nginx retornar 502 ao acessar `/api/*`, o container do backend pode estar parado ou com falha. Verifique:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs backend
```

Se o backend tiver caído (por exemplo após migração ou erro de conexão com o banco), suba de novo:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d backend
```

O frontend usa o nome do serviço `backend` para falar com a API; após reinício do backend, as requisições passam a usar o IP correto do container.

### Parar tudo

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
```

---

## 10. Checklist de segurança

- [ ] Security Group: apenas **22** (SSH), **8080** (HTTP) e **8443** (HTTPS) abertos para 0.0.0.0/0 (ou só os IPs que precisam); evite expor 3000 ou 5432.
- [ ] `.env` com senhas fortes e secrets únicos; nunca commitar `.env`.
- [ ] Domínio com DNS apontando para o IP/ELB da EC2 antes de rodar o Certbot.
- [ ] Renovação do certificado: `sudo certbot renew --dry-run` sem erros.
- [ ] Backups do volume do PostgreSQL (script ou snapshot EBS), se necessário.

---

## 11. Resumo dos arquivos de deploy

| Arquivo | Uso |
|--------|-----|
| `docker-compose.yml` | Serviços da aplicação |
| `docker-compose.prod.yml` | Override: frontend em 8081, sem expor backend/postgres |
| `deploy/nginx-casaemdia.conf` | Configuração Nginx nas portas **8080** (HTTP) e **8443** (HTTPS) |
| `docs/DEPLOY-EC2.md` | Este guia |

O Casa em Dia fica acessível em **http://seu-dominio.com.br:8080** e **https://seu-dominio.com.br:8443**, sem conflito com outro serviço em 80/443.
