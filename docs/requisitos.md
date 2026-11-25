# Requisitos do YALA 1.0

**Revisão de 25 de novembro de 2026**

O YALA propõe facilitar o contato entre estudantes da América do Sul com interesses
acadêmicos em comum. O levantamento parte do projeto de extensão, dos slides de
planejamento e da decisão da equipe de incluir contas e mensagens entre usuários
no protótipo. A utilidade para o público ainda deverá ser avaliada com estudantes.

## Requisitos funcionais

| ID | Requisito | Critério de aceitação |
| --- | --- | --- |
| RF-01 | Criar conta, entrar e sair. | Cadastrar um nome único e uma senha válida. Recarregar mantém a sessão. Sair encerra a sessão e exige novo login. |
| RF-02 | Criar e editar perfil acadêmico. | Salvar nome, país, universidade, curso e interesses. Ao entrar novamente, os campos salvos aparecem no formulário. |
| RF-03 | Consultar o diretório de estudantes. | Uma conta conectada vê perfis preenchidos de outras contas. O formulário apresenta o próprio perfil. |
| RF-04 | Pesquisar e filtrar perfis. | Filtrar pelo país e buscar por universidade, curso ou interesse. Exibir aviso quando não houver resultado. |
| RF-05 | Enviar mensagem privada a outro perfil. | Um estudante com perfil preenchido abre a conversa e envia texto de até 500 caracteres. O destinatário consulta a mensagem ao abrir ou atualizar a conversa. |
| RF-06 | Consultar o histórico e responder. | As duas contas veem a troca nos dois sentidos, na ordem de registro. Uma terceira conta vê apenas suas próprias conversas. |
| RF-07 | Excluir a conversa do próprio histórico. | Após confirmar, a conta perde acesso às mensagens anteriores. A outra conta mantém o histórico e novas mensagens aparecem para ambas. |

## Requisitos não funcionais

| ID | Requisito | Critério de aceitação |
| --- | --- | --- |
| RNF-01 | Interface em português, adaptada a tela móvel. | Percorrer as funções principais em janela de 390 px sem rolagem horizontal. |
| RNF-02 | Persistência em banco local. | Reiniciar o servidor com o mesmo arquivo SQLite e recuperar os perfis e o histórico. |
| RNF-03 | Proteção de credenciais e acesso às mensagens. | Guardar senha com hash e salt. Exigir sessão válida para consultar perfis ou mensagens. Derivar o remetente da sessão no servidor. |
| RNF-04 | Execução local reproduzível. | Iniciar com Node.js 24 e criar o banco automaticamente a partir do esquema versionado. |

## Regras do sistema

- **RN-01.** O nome de usuário é único, tem de 3 a 24 caracteres e aceita letras sem acento, números e sublinhado. A senha deve ter de 8 a 128 caracteres.
- **RN-02.** Os cinco campos do perfil são obrigatórios. O país deve pertencer à lista exibida no formulário. Só perfis preenchidos aparecem no diretório.
- **RN-03.** País e termos da busca são combinados. A pesquisa textual ignora acentos e capitalização.
- **RN-04.** O remetente deve ter perfil preenchido. O destinatário deve ser outra conta com perfil preenchido. O sistema rejeita mensagens em branco.
- **RN-05.** O histórico reúne mensagens enviadas e recebidas entre a conta conectada e o destinatário selecionado. A atualização é solicitada na interface.

## Limites desta etapa

A demonstração usa contas de teste. Grupos, materiais, oportunidades, interface
em espanhol e tradução seguem como hipóteses para versões posteriores. Recuperação
de conta, moderação e operação pública estão fora do escopo demonstrado. A
participação externa é opcional para esta entrega, conforme informado pela equipe.

## Segurança e exclusão de conversas

Os requisitos da versão online e seus critérios de aceitação estão em [Sigilo das conversas e direitos dos usuários](privacidade-conversas.md).
