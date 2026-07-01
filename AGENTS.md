## Development

`astro dev` on this Astro/`@astrojs/cloudflare` version pair has a known bug: any
server-render error crashes Astro's own dev-mode error logger (`process is not
defined`, thrown from inside the workerd sandbox), which masks the real error
and returns a blank 500 on every route. Don't chase that — instead build and
run the actual Worker:

```
npm run build
npx wrangler dev
```

This exercises the real Cloudflare runtime (including local D1/R2 shims) and
reports errors normally. Use `astro dev` only for fast CSS/markup iteration
where you don't need working D1/R2/API routes.

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
