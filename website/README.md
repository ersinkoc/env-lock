# env-lock Website

Static website for @oxog/env-lock package documentation.

## Structure

- `index.html` - Home page with features and quick start
- `docs.html` - Complete API documentation
- `examples.html` - Real-world examples and use cases

## Technologies

- **Tailwind CSS** - Utility-first CSS framework (via CDN)
- **Alpine.js** - Lightweight JavaScript framework (via CDN)
- **Shadcn UI** - Design system inspired styling

## Local Development

Simply open any HTML file in your browser. No build step required!

```bash
# Using Python
python -m http.server 8000 -d website

# Using Node.js
npx serve website

# Using PHP
php -S localhost:8000 -t website
```

Then visit http://localhost:8000

## Deployment

The website is automatically deployed to GitHub Pages when changes are pushed to the `main` branch.

Deployment is handled by `.github/workflows/deploy-website.yml`

## Setup GitHub Pages

1. Go to repository Settings → Pages
2. Source: GitHub Actions
3. The website will be available at: `https://ersinkoc.github.io/env-lock/`

## Features

- ✅ Fully responsive design
- ✅ Mobile-friendly navigation
- ✅ Syntax-highlighted code blocks
- ✅ Interactive tabs and examples
- ✅ SEO optimized
- ✅ Zero build dependencies
- ✅ Fast loading times
