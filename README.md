# HRC Tools

Hosted code for the calculators and quizzes on hrcuso.com. Each tool lives in one file here. Change it once and every page that embeds it updates within about 10 minutes (GitHub Pages caching).

| Tool | File | Status |
|---|---|---|
| Member Leakage Calculator | `tools/member-leakage.js` | Built |
| Build vs. Partner Cost Comparison | `tools/build-vs-partner.js` | Next |
| Mortgage Program Readiness Quiz | `tools/readiness-quiz.js` | Planned |
| Single-Product Risk Calculator | `tools/single-product-risk.js` | Planned |

## How it fits together

- `hrc-tools.js` is the only script a page loads. It finds every embed spot, loads that tool's file from `tools/`, and renders it inside a Shadow DOM so Webflow styles and tool styles never collide.
- The core also owns the lead form, the results gate and the HubSpot submission, so every tool captures leads the same way.
- If the script can't load for any reason, the content inside the embed `div` stays visible. Always put a short message and a "Talk with our team" link there.

## Embed snippet (one Webflow component per tool)

```html
<div data-hrc-tool="member-leakage"
     data-hs-portal="YOUR_PORTAL_ID"
     data-hs-form="YOUR_FORM_GUID"
     data-source="tools-page"
     data-booking-url="https://your-booking-link">
  <p>The calculator didn't load. <a href="/contact">Talk with our team</a></p>
</div>
<script src="https://tools.hrcuso.com/hrc-tools.js" defer></script>
```

Until the custom domain is live, use `https://macaronibella.github.io/hrc-tools/hrc-tools.js`.

| Attribute | What it does |
|---|---|
| `data-hrc-tool` | Which tool to render (the file name in `tools/`, without `.js`) |
| `data-hs-portal`, `data-hs-form` | HubSpot portal ID and form GUID. Leave both off and the tool runs in preview mode: the gate unlocks but nothing is sent |
| `data-source` | Where the lead came from, saved to `hrc_tool_source` (e.g. `tools-page`, `how-we-help`, `linkedin-ad`) |
| `data-booking-url` | Link for the "Book a call" button after a lead submits. The button is hidden when this is empty |
| `data-consent-text` | Optional. Adds a required consent checkbox with this text and sends it as HubSpot legal consent |
| `data-hs-subscription` | Optional. HubSpot subscription type ID to opt the lead into, used with `data-consent-text` |
| `data-privacy-text` | Optional. Replaces the default privacy line under the form |

To restyle every tool at once, set these CSS variables on the page (Webflow custom code or an embed): `--hrc-font-display`, `--hrc-font-ui`, `--hrc-font-body`, `--hrc-navy`, `--hrc-navy-2`, `--hrc-lime`, `--hrc-lime-bright`, `--hrc-field`, `--hrc-text`, `--hrc-muted`, `--hrc-line`.

## HubSpot

See [`docs/hubspot-setup.md`](docs/hubspot-setup.md) for the form, properties and workflow setup.

## Rules for this repo

- Nothing secret goes here: no API keys, private app tokens, internal pricing or 95-5 program mechanics. Everything in this repo is public, and the code runs in visitors' browsers.
- Every figure a tool uses must be sourced, and the source must be shown on the tool. Anything not from a published source is labeled as an assumption the visitor can change.
- Copy follows the HRC site rules: no em dashes, no "X, not Y" headlines, no HRC pricing, no loan timelines.

## Adding a tool

1. Create `tools/<name>.js` that calls `HRCTools.register('<name>', { css, mount })`.
2. Build the inputs and results inside `ctx.container`, and get the shared lead form with `ctx.buildGate({ getResults, onUnlocked })`.
3. Add a demo page in `demo/` and a row to `index.html` and this README.
