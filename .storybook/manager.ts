import { addons } from 'storybook/manager-api'
import { create } from 'storybook/theming'
addons.setConfig({ theme: create({ base: 'light', brandTitle: 'AQ · Interface', brandUrl: '/', brandImage: '/aq.svg', colorPrimary: '#7c3aed', colorSecondary: '#7c3aed', fontBase: 'Inter, system-ui, sans-serif' }) })
