# github-contributions-card

Dynamically generated SVG card showing your GitHub PR contributions — designed for README embeds.

![Preview](https://ghcard.cuevaneander.tech/card.svg?username=4drian0rtiz&theme=TokyoNight&per_page=10)

---

## Usage

### Static embed (recommended)

```md
![GitHub Contributions](https://ghcard.cuevaneander.tech/card.svg?username=YOUR_USERNAME)
```

### With custom theme and pagination

```md
![GitHub Contributions](https://ghcard.cuevaneander.tech/card.svg?username=YOUR_USERNAME&theme=TokyoNight&per_page=5&page=1)
```

### Clickable card (wraps the image in a link)

```html
<a href="https://github.com/YOUR_USERNAME">
  <img src="https://ghcard.cuevaneander.tech/card.svg?username=YOUR_USERNAME" />
</a>
```

> **Note:** links inside the SVG don't work when embedded as `<img>`. Wrap the image in an `<a>` tag if you want it clickable.

---

## Parameters

| Parameter  | Description          | Default   | Notes              |
|------------|----------------------|-----------|--------------------|
| `username` | GitHub username      | —         | Required           |
| `theme`    | Color theme          | `Gruvbox` | See list below     |
| `per_page` | PRs per page (1–100) | `10`      |                    |
| `page`     | Page number          | `1`       | Use with `per_page`|

### Themes

`Gruvbox` · `TokyoNight` · `Catppuccin` · `Nord` · `OneDark` · `Terminal`

---

## Rate limits

The card fetches data from the GitHub API on every request. Without a token, GitHub allows **60 requests/hour** per IP (shared with Netlify's egress IPs — hits the limit fast).

If you're self-hosting, set `GITHUB_TOKEN` in your environment:

```
GITHUB_TOKEN=ghp_your_token_here
```

Generate one at **GitHub → Settings → Developer settings → Personal access tokens**. Only `public_repo` scope is needed.

---

## Interactive preview

Open the SPA to preview themes and pagination before embedding:

```
https://ghcard.cuevaneander.tech/?username=YOUR_USERNAME&theme=TokyoNight
```

---

## What it shows

- Total PRs authored (excluding your own repos)
- Merged / Open / Closed breakdown
- Per-PR: title, repository, star count, status
- Pagination support for large contribution histories
