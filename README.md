# YALA 1.0

Protótipo web de uma rede acadêmica sul-americana, com contas, diretório de perfis
e mensagens privadas entre duas contas.

Na raiz do repositório, com Node.js 24:

```sh
node server.mjs
```

Abra `http://127.0.0.1:8000` no navegador da mesma máquina. O SQLite é criado
automaticamente em `data/yala.sqlite`. Nenhum pacote externo é necessário.
Para trocar o arquivo de dados, configure `YALA_DB`. Para trocar a porta, use `PORT`.

## Demonstração

1. Abra a página em dois perfis de navegador distintos, como uma janela normal e
   outra privada. Crie uma conta de teste em cada um e salve os perfis acadêmicos.
2. Na primeira janela, atualize o diretório e use os filtros para localizar a
   segunda conta. Abra a conversa e envie uma mensagem.
3. Na segunda janela, atualize o diretório, abra a conversa com a primeira conta
   e responda. Use **Atualizar conversa** para buscar a resposta na primeira janela.

4. Na primeira janela, use **Excluir conversa do meu histórico** e confirme.
   Atualize nos dois lados para conferir a exclusão individual. Envie uma nova
   mensagem para verificar que ela aparece para os dois participantes.

Use dados fictícios e senhas exclusivas para o teste. A demonstração foi projetada
para execução local. Hospedagem pública requer HTTPS e controles adicionais de
acesso, moderação e operação.

- [Requisitos](docs/requisitos.md)
- [Modelo do banco de dados](docs/banco-de-dados.md)
- [Diagramas de atividade e casos de uso](docs/diagramas.md)
- [Materiais do trabalho acadêmico](materiais-trabalho/README.md)
