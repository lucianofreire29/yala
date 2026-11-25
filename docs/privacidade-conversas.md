# Sigilo das conversas e direitos dos usuários

**YALA 1.0 · Decisões para a versão online**

## Acesso às mensagens

A versão online deve usar HTTPS, Firebase Authentication e regras do Cloud
Firestore com acesso negado por padrão. Cada conversa tem exatamente dois
identificadores distintos de usuários, que permanecem fixos. As regras devem
validar a identidade do remetente e permitir que apenas os participantes leiam
ou enviem mensagens. A autorização precisa funcionar mesmo quando a pessoa
consulta o Firestore diretamente.

A interface e o Render não devem registrar o texto das mensagens em logs ou
ferramentas de análise. O projeto Firebase deve restringir o acesso
administrativo, pois credenciais privilegiadas podem acessar os dados mesmo
quando as regras bloqueiam outros usuários. HTTPS e criptografia em repouso
protegem o transporte e o armazenamento, respectivamente. Criptografia de ponta
a ponta seria um projeto adicional, com gestão de chaves por dispositivo e
decisões sobre recuperação e backups. Para o piloto, o requisito é restringir
o acesso aos participantes e aos acessos administrativos estritamente necessários.

## Exclusão do próprio histórico

A interface deve oferecer **Excluir conversa do meu histórico**, com confirmação
de que o outro participante mantém a cópia dele. Para cada pessoa, a aplicação
deve guardar um marco de exclusão definido com horário do servidor. A pessoa
pode avançar apenas o próprio marco. Após a confirmação, as regras devem impedir
que a pessoa consulte mensagens anteriores ou iguais ao marco, inclusive por
consulta direta. Novas mensagens continuam acessíveis.

A consulta do histórico deve incluir esse mesmo limite. As regras do Firestore
avaliam o que a consulta pode retornar. A interface deve limpar o histórico
aberto e qualquer cache de mensagens mantido pelo app após confirmar a exclusão.
A persistência offline de conteúdo privado fica desativada no piloto.

Se os dois participantes excluírem o histórico, as mensagens que ficaram
inacessíveis para ambos poderão ser removidas conforme política de retenção
definida. Essa remoção deve alcançar os documentos de mensagens, que ficam em
subcoleções do Firestore. Apagar apenas o documento da conversa não elimina os
documentos da subcoleção.

## LGPD

O aviso de privacidade deve identificar o responsável pelo tratamento e o canal
para exercício de direitos, além de explicar finalidades, bases legais,
prestadores envolvidos, retenção e tratamento de cópias de segurança. Antes de
usar dados de participantes reais, a equipe deve alinhar essas decisões com a
instituição, inclusive a região de armazenamento e eventuais transferências
internacionais. O piloto pode usar contas e perfis fictícios.

O usuário deve ter um canal para solicitar acesso, correção e, quando
aplicável, eliminação de dados pessoais. O pedido deve ter identidade
verificada e resposta sobre quais dados foram eliminados, anonimizados ou
retidos e por qual fundamento. A análise considera a base legal, as hipóteses
legais de conservação e os direitos do outro participante. A exclusão do
histórico na interface atende a uma preferência de uso e é um fluxo distinto
do atendimento de um pedido de eliminação pela LGPD.

Fonte legal: [Lei nº 13.709/2018, arts. 6º, 15, 16, 18 e 46](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm).

## Critérios de aceitação propostos

| ID | Verificação |
| --- | --- |
| SEG-01 | A e B trocam mensagens. A conta C e uma sessão anônima recebem acesso negado ao tentar ler ou escrever na conversa, inclusive por acesso direto ao Firestore. |
| SEG-02 | O sistema rejeita tentativa de enviar mensagem usando outro remetente ou de alterar o par de participantes. |
| PRIV-01 | Depois que A exclui o próprio histórico, A deixa de ler as mensagens anteriores, inclusive por consulta direta. B continua vendo sua cópia. Novas mensagens aparecem para A e B. |
| PRIV-02 | A interface informa o alcance da exclusão antes de pedir confirmação e disponibiliza o canal de direitos do titular. |

## Implementação e verificação no protótipo local

O protótipo usa Node.js e SQLite. A identidade vem da sessão e a consulta
considera somente a conta autenticada e o perfil escolhido. A exclusão guarda
em `cleared_histories` o último identificador de mensagem do par no momento da
confirmação. O servidor aplica esse limite a toda consulta posterior da conta,
inclusive após reiniciar. A implementação preserva as linhas originais de
mensagem para que a outra pessoa mantenha o histórico.

O teste com contas fictícias verificou que cancelar preserva o histórico,
confirmar remove as mensagens anteriores da visualização e da resposta da API
para a conta solicitante, e a outra conta continua vendo as mensagens
anteriores. Uma nova mensagem apareceu para ambas. A regra individual persistiu
após reiniciar o servidor. A API recusou exclusão sem sessão. O teste começou
com o esquema anterior do SQLite e a nova tabela foi criada na inicialização.

As regras de acesso e o marco por horário do servidor estão implementados na
versão online. A verificação em emulador foi adicionada ao GitHub Actions e
precisa ter o resultado confirmado antes do deploy. O canal de direitos, a política de
retenção e o procedimento de eliminação permanecem pendentes de definição com
a instituição antes de tratar dados reais.
