FROM public.ecr.aws/docker/library/node:20-alpine

# Declaring env
ENV NODE_ENV production

# Installing libvips-dev for sharp compatability
RUN apk add --no-cache libc6-compat

# Define o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copie o arquivo package.json e package-lock.json (se existir) do host para o contêiner
#COPY package*.json ./
COPY package.json .

# Instale as dependências usando Yarn
RUN yarn config set network-timeout 600000 -g
RUN yarn install

# Copie o restante dos arquivos do host para o contêiner
COPY . .

# Exponha a porta em que o aplicativo é executado
EXPOSE 3000


# Comando para iniciar o servidor quando o contêiner for executado
#CMD ["yarn", "run", "develop"]
CMD ["yarn", "start"]
