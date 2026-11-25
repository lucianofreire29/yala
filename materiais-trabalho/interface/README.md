# Interface do YALA 1.0

**Revisão de 25 de novembro de 2026**

## Proposta visual

A organização visual usa padrões de uma rede profissional, como navegação
superior, diretório com cartões acadêmicos e painel lateral de perfil e conversa.
A marca do YALA usa verde-floresta (`#12382F`), verde-folha (`#1E5949`),
terracota (`#994B32`), amarelo-milho (`#F5CF78`) e fundo claro (`#F4F6F2`).
A paleta faz referência à vegetação e às paisagens sul-americanas. A imagem de
fundo é uma paisagem ilustrativa gerada para o YALA, inspirada nos Andes tropicais.

## Telas e interações

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
