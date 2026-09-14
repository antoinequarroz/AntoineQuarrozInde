# Antoine Quarroz — site et administration

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Le projet utilise exclusivement npm, comme la CI et la production. Le mode
`legacy-peer-deps` est configuré dans `.npmrc` pour respecter le lockfile actuel.

```bash
npm ci
```

## Development Server

Le serveur local persistant est géré avec Portly :

```bash
portly start AntoineQuarrozInde/web
```

## Production

Build the application for production:

```bash
npm run build
```

Locally preview production build:

```bash
npm run preview
```

Les procédures de livraison et de rollback sont documentées dans
[`docs/operations.md`](docs/operations.md).
