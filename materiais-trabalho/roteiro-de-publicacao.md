# Roteiro de publicação do YALA

O navegador executa a interface em HTML, CSS e JavaScript. O Render publica
os arquivos estáticos em HTTPS. Firebase Authentication gerencia a identidade
por e-mail e senha. Cloud Firestore guarda os perfis, as conversas privadas e
os marcos de exclusão do histórico. GitHub Actions executa as verificações.
A versão local de demonstração usa Node.js e SQLite.

## 1. Criar o projeto Firebase

1. Abra o [Console do Firebase](https://console.firebase.google.com/) com a conta
   Google escolhida pela equipe e selecione **Adicionar projeto**.
2. Use **YALA Testes** como nome de exibição. Anote o ID único que o Firebase
   atribuir. Este roteiro considera um projeto dedicado a testes fictícios.
3. O Google Analytics é opcional e pode ficar desativado neste piloto.
4. Na página inicial do projeto, selecione o ícone **Web** (`</>`) e registre
   um aplicativo chamado **YALA Web**. Deixe a configuração de Firebase Hosting
   desmarcada, pois o site será publicado no Render.
5. Copie apenas `apiKey`, `authDomain`, `projectId` e `appId` de
   `firebaseConfig`. Esses campos identificam o aplicativo Web e ficam
   acessíveis no navegador. Senhas, chaves privadas e arquivos de conta de
   serviço devem permanecer fora do repositório e do chat.

## 2. Ativar login e preparar o banco

1. No Firebase, abra **Authentication → Começar → Método de login**. Ative
   **E-mail/senha** e salve.
2. Abra **Firestore Database → Criar banco de dados**. Use o banco padrão
   `(default)`, edição Standard, em **modo produção**. Antes de confirmar a
   região, registre a escolha com a equipe. Antes de admitir dados reais,
   alinhe a região e a política de tratamento com a faculdade.
3. Confira o resultado do job Firebase no [GitHub Actions](https://github.com/lucianofreire29/yala/actions)
   no commit que será publicado. O job testa o acesso a mensagens com contas
   fictícias e o fluxo no navegador. Se falhar, corrija e rode novamente.
4. Com acesso autorizado ao projeto, aplique as [regras do repositório](../firestore.rules)
   pelo Console em **Firestore Database → Regras**, ou execute os comandos abaixo
   na raiz do repositório com Node.js 24. Substitua `ID_DO_PROJETO` pelo ID
   anotado e confira o projeto indicado antes de executar o deploy.

```sh
npm ci
npx firebase login
npx firebase deploy --only firestore:rules --project ID_DO_PROJETO
```

## 3. Publicar a interface no Render

1. No [painel do Render](https://dashboard.render.com/), selecione **New →
   Blueprint**, conecte o repositório `lucianofreire29/yala` e escolha a branch
   `desenvolvimento/yala-1.0` para a publicação de teste.
2. O arquivo [render.yaml](../render.yaml) declara um Static Site, com
   `npm ci --include=dev && npm run build:online` como comando de build e
   `dist/` como diretório publicado.
3. Preencha as variáveis da configuração Web do Firebase no Render.

| Campo do Firebase | Variável no Render |
| --- | --- |
| `apiKey` | `YALA_FIREBASE_API_KEY` |
| `authDomain` | `YALA_FIREBASE_AUTH_DOMAIN` |
| `projectId` | `YALA_FIREBASE_PROJECT_ID` |
| `appId` | `YALA_FIREBASE_APP_ID` |

4. Aguarde o deploy e abra o endereço HTTPS mostrado pelo Render. Caso um fluxo
   futuro use login com redirecionamento, confira os domínios autorizados em
   **Authentication → Configurações**.

## 4. Verificar e registrar a entrega

- Crie três contas fictícias em sessões independentes e salve os perfis.
- Use duas contas para buscar perfis, enviar e responder mensagens.
- Confirme que a terceira conta só consegue consultar suas próprias conversas.
- Em uma conta, exclua o próprio histórico. Confira que a outra mantém as
  mensagens e que ambas veem novas mensagens.
- Registre a data, o commit, o resultado do Actions e o endereço do Render
  no trabalho. Use apenas conteúdo fictício nas capturas.
- O piloto usa avatares com iniciais. O upload de fotos pode ser configurado
  depois no Cloud Storage, etapa que exige avaliar o plano Blaze.

[Arquitetura e verificação](../docs/publicacao-firebase.md) ·
[Privacidade e LGPD](../docs/privacidade-conversas.md)
