# Task: Reestruturação Profunda do Layout Desktop do Cardápio

## Objetivo
Transformar o layout de desktop do cardápio de um modelo centralizado/espremido para um modelo de grid preenchido, com sidebar ancorada à esquerda e cards verticais, inspirado no design Premium da Referência 2.

## Requisitos Técnicos
- Media Queries: `min-width: 1024px` (lg).
- Não alterar layout Mobile.
- Tailwind CSS para estilização responsiva.

## Etapas de Implementação
- [x] Ajustar Content Wrapper para largura expandida no Desktop.
- [x] Reposicionar Sidebar de Categorias para a esquerda absoluta (Desktop).
- [x] Transformar Grid de Produtos de 2 para 3 colunas no Desktop.
- [x] Refatorar componente de Card de Produto para orientação Vertical (Desktop).
- [x] Implementar Badge de Avaliação flutuante na imagem.
- [x] Implementar Ícone de Carrinho estilizado substituindo o link de texto.
- [x] Aplicar Design System (Bordas 12px, Sombras Suaves, Fundo Branco).

## Verificação
- [x] Verificar integridade do Mobile.
- [x] Validar alinhamento do Grid em diferentes larguras de monitor.
- [x] Testar interatividade do botão de carrinho.
- [x] Executar checklist.py para auditoria final.
