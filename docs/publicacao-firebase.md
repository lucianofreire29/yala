# Publicação do YALA no Render com Firebase

O protótipo atual usa Node.js e SQLite. Para a versão online de testes, a proposta é hospedar a interface estática como Static Site no Render e usar Firebase Authentication e Cloud Firestore. O backend Node e o banco SQLite seguem disponíveis para a demonstração local durante a migração.

| Serviço | Uso no YALA |
| --- | --- |
| Firebase Authentication | Cadastro e login com e-mail e senha. O identificador `uid` vincula a conta aos dados da aplicação. |
| Cloud Firestore | Perfis acadêmicos, conversas e mensagens. Os ouvintes do Firestore podem atualizar o histórico nas duas janelas durante a demonstração. |
| Render Static Site | Publicação da interface em HTTPS a partir do repositório Git. |
| Cloud Storage for Firebase | Upload opcional de fotos de perfil. Os arquivos ficam no Storage e o perfil guarda uma referência. |

## Modelo proposto

- `profiles/{uid}`. Nome de exibição, país, universidade, curso e interesses. O diretório pode ser lido por pessoas autenticadas. Cada pessoa edita o próprio perfil. O e-mail de login fica no Authentication.
- `conversations/{id}`. Dois identificadores distintos de usuários. O par permanece fixo após a criação. A leitura é limitada aos participantes.
- `conversations/{id}/messages/{messageId}`. Remetente, texto de até 500 caracteres e horário do servidor. Só participantes podem consultar ou criar mensagens. O remetente deve corresponder à conta autenticada.
- `avatars/{uid}/profile`. Caminho proposto para a foto. O envio deve ser limitado ao dono do perfil, com regras de tamanho e tipo. No primeiro teste, a interface pode exibir iniciais enquanto o upload estiver desativado.

O Render serve os arquivos públicos da interface. O navegador acessa o Authentication e o Firestore diretamente. A migração requer trocar as chamadas ao servidor local pelas operações do Firebase e validar as regras do Firestore. Para preservar o filtro textual por universidade, curso e interesses no piloto, a interface pode aplicar a busca sobre o diretório carregado. O Firestore não oferece busca textual completa nativa.

## Publicação e verificação

1. Identificar o projeto Firebase de teste autorizado e cadastrar a aplicação Web.
2. Ativar login por e-mail e senha e criar o Firestore. Manter o acesso bloqueado até a publicação das regras específicas do YALA.
3. Migrar o fluxo e verificar as regras com duas contas de teste e uma terceira sem acesso à conversa. Criar novas contas de teste no Authentication.
4. Conectar o repositório ao Render, selecionar a branch de publicação e apontar o Static Site para um diretório com apenas os arquivos públicos da interface.
5. Configurar o domínio do Render no Firebase Authentication quando exigido pelo fluxo de login, como em provedores com redirecionamento. Repetir cadastro, busca, envio, leitura e isolamento no endereço HTTPS.
6. Se o upload entrar no piloto, confirmar o plano Blaze exigido pelo Cloud Storage for Firebase, configurar o bucket e testar tamanho, tipo e acesso.

O Render é a plataforma escolhida para a publicação. A versão atual ainda usa a API Node e o SQLite locais. A publicação como Static Site depende da migração da interface, de um projeto Firebase de teste e da conexão do repositório ao Render.
