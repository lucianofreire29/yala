# Interface do YALA 1.0

**Revisão de 25 de novembro de 2026**

## Proposta visual

A organização visual usa padrões de uma rede profissional, como navegação
superior, diretório com cartões acadêmicos e painel lateral de perfil e conversa.
A marca do YALA usa verde-floresta (`#12382F`), verde-folha (`#1E5949`),
terracota (`#994B32`), amarelo-milho (`#F5CF78`) e fundo claro (`#F4F6F2`).
A paleta faz referência à vegetação e às paisagens sul-americanas. A imagem de
fundo é uma paisagem ilustrativa gerada para o YALA, inspirada nos Andes tropicais.

## Revisão da navegação

Após o teste com duas contas, o YALA passou a ter abas separadas para **Explorar**,
**Amigos** e **Meu perfil**. Em Explorar é possível enviar convites. A aba Amigos
mostra amizades confirmadas, convites recebidos e convites enviados. O aceite
feito pelo destinatário coloca os dois perfis na lista um do outro.

O chat tem tela própria, com histórico rolável, campo de mensagem e opções da
conversa. Voltar retorna ao diretório ou à aba Amigos, conforme a origem. A busca
e o filtro são preservados ao voltar ao diretório. No celular, o campo de
mensagem fica junto à base do chat. Conversas já podem ser abertas pelo
diretório durante o piloto.

| Captura atual | O que documenta |
| --- | --- |
| [Chat no celular](04-chat-movel.png) | Tela dedicada, histórico rolável e campo de mensagem. |
| [Chat no desktop](05-chat-desktop.png) | Tela dedicada em uma janela mais larga. |
| [Amigos no celular](06-amigos-movel.png) | Amizades confirmadas e convites nas próprias listas. |
| [Explorar no desktop](07-explorar-desktop.png) | Diretório com navegação para Amigos e Meu perfil. |

No Chromium local, foram verificados o convite, o aceite, a lista bilateral,
a navegação entre as telas, o retorno com a busca preservada, a reabertura do
chat pelo navegador e a exclusão individual do histórico. O build para o Render
passou. A verificação online dos convites depende da publicação das novas regras
do Firestore.

## Capturas da primeira versão

| Tela | Decisão de interface | Material para o artigo |
| --- | --- | --- |
| Acesso | Apresentação do projeto ao lado do formulário de entrada e criação de conta. | [Figura 1 — Tela de acesso](01-acesso.png) |
| Rede | Busca por universidade, curso ou interesse, filtro por país e cartões com iniciais e informações acadêmicas. | [Figura 2 — Diretório, conversa e perfil](02-rede-e-conversa.png) |
| Perfil e conversa | Na área lateral, o estudante edita o perfil e consulta a conversa. O histórico identifica o remetente, a data e o horário. | [Figura 2 — Diretório, conversa e perfil](02-rede-e-conversa.png) |
| Rede em celular | A navegação, o diretório, a conversa e o perfil ocupam uma coluna. | [Figura 3 — Interface móvel](03-rede-movel.png) |

A interface usa HTML, CSS e JavaScript, formulários com rótulos, indicação visual
de foco e um atalho de teclado para o conteúdo principal. Ao fechar uma conversa,
o foco retorna ao cartão correspondente quando ele ainda está visível.

## Verificação

O protótipo foi executado com Node.js e SQLite. No Chromium, três contas fictícias
foram usadas para exercitar cadastro, perfil, busca, troca de mensagens, isolamento
do histórico, saída e login. A equipe pode reproduzir o teste no fluxo do README
principal. O histórico continuou disponível após reiniciar o servidor. A versão
móvel foi verificada em largura de 390 px, sem rolagem horizontal. Também foi
verificado que fechar e reabrir a conversa preserva o histórico e que o foco
retorna ao botão do cartão ao fechar.

As figuras são capturas do protótipo funcionando com contas fictícias. Para o
artigo, use a legenda «Fonte: captura do protótipo YALA 1.0, elaboração própria».
Para descrever a imagem de fundo, indique que ela foi gerada para o projeto.

## Publicação

A integração com Firebase Authentication e Firestore e a publicação no Render
continuam previstas. As capturas representam o protótipo local. Os avatares usam
iniciais. O upload de fotos está previsto como opção para uma etapa posterior.
[Plano de publicação](../../docs/publicacao-firebase.md)
