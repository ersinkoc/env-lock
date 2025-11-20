# GitHub Pages Setup Instructions

This repository includes a professional static website for env-lock documentation. Follow these steps to enable GitHub Pages deployment.

## Quick Setup (2 minutes)

### 1. Enable GitHub Pages

1. Go to your repository on GitHub: `https://github.com/ersinkoc/env-lock`
2. Click **Settings** (top navigation)
3. Scroll down and click **Pages** (left sidebar)
4. Under **Build and deployment**:
   - **Source**: Select **GitHub Actions**
   - Save the changes

### 2. Trigger Deployment

The website will automatically deploy when:
- Changes are pushed to the `main` branch in the `website/` folder
- You manually trigger the workflow

To manually trigger the deployment:
1. Go to **Actions** tab
2. Click **Deploy Website to GitHub Pages**
3. Click **Run workflow**
4. Select branch: `main`
5. Click **Run workflow**

### 3. Access Your Website

After deployment completes (usually 1-2 minutes):
- Your website will be available at: **https://ersinkoc.github.io/env-lock/**

## Website Structure

```
website/
├── index.html          # Home page
├── docs.html           # API documentation
├── examples.html       # Real-world examples
├── README.md           # Website documentation
└── .nojekyll          # Tells GitHub Pages not to use Jekyll
```

## Features

✅ **Static HTML** - No build step required
✅ **Tailwind CSS** - Modern, responsive design
✅ **Alpine.js** - Interactive components
✅ **Shadcn UI** - Professional styling
✅ **Mobile-friendly** - Responsive navigation
✅ **SEO optimized** - Meta tags and semantic HTML
✅ **Fast loading** - CDN-hosted dependencies

## Automatic Deployment

The website automatically deploys via GitHub Actions (`.github/workflows/deploy-website.yml`) when:
- You push changes to `website/` folder in the `main` branch
- You manually trigger the workflow

## Local Development

Test the website locally:

```bash
# Using Python
python -m http.server 8000 -d website

# Using Node.js
npx serve website

# Using PHP
php -S localhost:8000 -t website
```

Then visit: http://localhost:8000

## Customization

All HTML files are in the `website/` folder. To customize:

1. Edit the HTML files directly
2. Tailwind CSS classes are loaded via CDN
3. Alpine.js adds interactivity
4. No build step needed - just edit and push!

## Troubleshooting

### Website not showing?

1. Check that GitHub Pages is enabled (Settings → Pages)
2. Verify **Source** is set to **GitHub Actions**
3. Check Actions tab for deployment status
4. Wait 1-2 minutes after deployment

### 404 Error?

1. Make sure you're using the correct URL: `https://ersinkoc.github.io/env-lock/`
2. Check that `.nojekyll` file exists in `website/` folder
3. Verify the workflow completed successfully

### Changes not appearing?

1. Clear your browser cache (Ctrl+Shift+R or Cmd+Shift+R)
2. Check that changes are pushed to `main` branch
3. Wait for GitHub Actions to complete deployment

## Need Help?

- Check the [GitHub Actions tab](https://github.com/ersinkoc/env-lock/actions) for deployment logs
- Review the [workflow file](.github/workflows/deploy-website.yml)
- Read [GitHub Pages documentation](https://docs.github.com/en/pages)

---

**Note**: The website will be publicly accessible at `https://ersinkoc.github.io/env-lock/` after you enable GitHub Pages.
