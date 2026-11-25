# Publicação do YALA no Render com Firebase

O protótipo atual usa Node.js e SQLite. Para a versão online de testes, a proposta é hospedar a interface estática como Static Site no Render e usar Firebase Authentication e Cloud Firestore. O backend Node e o banco SQLite seguem disponíveis para a demonstração local. O build online seleciona o Firebase e muda o formulário de acesso para e-mail e senha.

| Serviço | Uso no YALA |
| --- | --- |
| Firebase Authentication | Cadastro e login com e-mail e senha. O identificador `uid` vincula a conta aos dados da aplicação. |
| Cloud Firestore | Perfis acadêmicos, conversas e mensagens. Os ouvintes do Firestore podem atualizar o histórico nas duas janelas durante a demonstração. |
| Render Static Site | Publicação da interface em HTTPS a partir do repositório Git. |
| Cloud Storage for Firebase | Upload opcional de fotos de perfil. Os arquivos ficam no Storage e o perfil guarda uma referência. |

## Modelo proposto

- `profiles/{uid}`. Nome de exibição, país, universidade, curso e interesses. O diretório pode ser lido por pessoas autenticadas. Cada pessoa edita o próprio perfil. O e-mail de login fica no Authentication.
- `conversations/{id}`. Dois identificadores distintos de usuários. O par permanece fixo após a criação. A leitura é limitada aos participantes.
- `conversations/{id}/historyCutoffs/{uid}`. Marco de exclusão definido pelo horário do servidor. Apenas o dono pode ler e atualizar o próprio marco.
- `conversations/{id}/messages/{messageId}`. Remetente, texto de até 500 caracteres e horário do servidor. Só participantes podem consultar ou criar mensagens. O remetente deve corresponder à conta autenticada.
- `avatars/{uid}/profile`. Caminho proposto para a foto. O envio deve ser limitado ao dono do perfil, com regras de tamanho e tipo. No primeiro teste, a interface pode exibir iniciais enquanto o upload estiver desativado.

O Render serve apenas os arquivos gerados em `dist/`. O navegador acessa o Authentication e o Firestore diretamente. Os históricos são consultados no servidor e filtrados pelo marco de exclusão de cada conta. O identificador da conversa combina os dois UIDs, ordenados pelo cliente. O diretório guarda apenas os campos acadêmicos. Para preservar o filtro textual por universidade, curso e interesses no piloto, a interface pode aplicar a busca sobre o diretório carregado. O Firestore não oferece busca textual completa nativa.

## Publicação e verificação

1. Identificar o projeto Firebase de teste autorizado e cadastrar a aplicação Web.
2. Ativar login por e-mail e senha e criar o Firestore. Manter o acesso bloqueado até a publicação das regras específicas do YALA.
3. Verificar as regras com `npm run test:rules` antes de publicá-las. Para aplicar ao projeto autorizado, usar `npx firebase deploy --only firestore:rules --project ID_DO_PROJETO` com uma conta autorizada.
4. Conectar o repositório e a branch de publicação ao Render. O [Blueprint](../render.yaml) configura o Static Site, o build e o diretório `dist/`. Preencher as variáveis de build com a configuração pública do aplicativo Web.
5. Configurar o domínio do Render no Firebase Authentication quando exigido pelo fluxo de login, como em provedores com redirecionamento. Repetir cadastro, busca, envio, leitura e isolamento no endereço HTTPS.
6. Se o upload entrar no piloto, confirmar o plano Blaze exigido pelo Cloud Storage for Firebase, configurar o bucket e testar tamanho, tipo e acesso.

## Variáveis do build

| Variável | Campo da configuração Web do Firebase |
| --- | --- |
| `YALA_FIREBASE_API_KEY` | `apiKey` |
| `YALA_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `YALA_FIREBASE_PROJECT_ID` | `projectId` |
| `YALA_FIREBASE_APP_ID` | `appId` |

Esses valores identificam o aplicativo Web e ficam no bundle do navegador.
A autorização de acesso a dados depende das regras e da autenticação.

## Verificação

O build estático passou localmente com configuração fictícia. O teste do
protótipo SQLite passou. A suíte do Firestore foi adicionada ao GitHub Actions.
O download do emulador falhou no ambiente local, portanto a execução dos testes
das regras precisa ser confirmada no Actions. A publicação e o teste com usuários
em HTTPS dependem de um projeto Firebase autorizado e da conexão do Render.
