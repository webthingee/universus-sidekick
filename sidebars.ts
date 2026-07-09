import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// The Guides sidebar holds the long-form pages (How to Play, Solo AI).
// The Glossary is a standalone interactive page at /glossary, not in this sidebar.
const sidebars: SidebarsConfig = {
  guidesSidebar: [
    'how-to-play',
    'anatomy-of-a-turn',
    {
      type: 'category',
      label: 'Solo AI',
      link: {type: 'doc', id: 'solo-ai'},
      items: ['solo-ai-turn-flow', 'solo-ai-details'],
    },
  ],
};

export default sidebars;
