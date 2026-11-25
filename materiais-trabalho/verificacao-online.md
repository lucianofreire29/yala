# Verificação da publicação do YALA

- **Data** 25 de novembro de 2026
- **Endereço testado** [YALA no Render](https://yala-zkyw.onrender.com/)
- **Referência do Blueprint** `c411364`, conforme o painel do Render compartilhado pela equipe

| Verificação | Método | Resultado |
| --- | --- | --- |
| Publicação da interface | Solicitação HTTPS ao Render | A página e o bundle JavaScript foram servidos. |
| Tela inicial | Chromium com recursos do Render obtidos pelo cliente HTTPS do ambiente | O formulário de e-mail e criação de conta carregou. |
| Cadastro e perfis | APIs do Firebase Authentication e do Firestore com três contas fictícias | Três cadastros e dois perfis de teste criados. |
| Comunicação e sigilo | Leitura e escrita nas APIs do Firestore | A mensagem foi lida pelo destinatário. A terceira conta e uma requisição anônima receberam acesso negado. |
| Exclusão individual | Marco de exclusão no Firestore e consulta das duas contas | A conta que excluiu perdeu o acesso à mensagem anterior. O outro participante manteve o histórico, e ambos puderam ler a nova resposta. |

A verificação funcional online ocorreu nas APIs. O fluxo completo pela interface
publicada ainda deve ser repetido no navegador, porque o Chromium do ambiente
de teste rejeitou o certificado do proxy em navegação direta. Os registros
fictícios dessa verificação foram mantidos no projeto de teste. O ensaio
documenta o funcionamento técnico e as permissões observadas nessa versão.

[Procedimento de publicação e teste](roteiro-de-publicacao.md) ·
[Critérios de segurança e privacidade](../docs/privacidade-conversas.md)
