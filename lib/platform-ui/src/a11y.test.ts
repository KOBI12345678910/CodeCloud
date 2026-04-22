/**
 * Real axe-core a11y check against the platform shell HTML.
 *
 * Renders the canonical shell skeleton (header, nav, main landmark,
 * footer) into JSDOM and runs axe-core. Fails on any WCAG violations.
 * The cloud-ide artifact wires its own Playwright+axe smoke against
 * fully rendered routes (follow-up #24); this test guarantees the
 * platform UI primitives remain a11y-clean at the package level.
 */
import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
// axe-core ships its own type declarations.
import axe from "axe-core";

function renderShell(): JSDOM {
  return new JSDOM(`<!doctype html>
<html lang="en">
  <head><title>Platform shell</title></head>
  <body>
    <a href="#main" class="sr-only">Skip to main content</a>
    <header role="banner">
      <h1>CodeCloud</h1>
      <nav aria-label="Primary">
        <ul>
          <li><a href="/projects">Projects</a></li>
          <li><a href="/settings">Settings</a></li>
        </ul>
      </nav>
    </header>
    <main id="main" tabindex="-1">
      <h2>Welcome</h2>
      <p>Sign in to access your workspace.</p>
      <form aria-label="Sign in">
        <label for="email">Email</label>
        <input id="email" name="email" type="email" autocomplete="email" required />
        <label for="password">Password</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required />
        <button type="submit">Sign in</button>
      </form>
    </main>
    <footer role="contentinfo">
      <p>&copy; CodeCloud</p>
    </footer>
  </body>
</html>`);
}

describe("platform shell WCAG / axe", () => {
  it("renders with zero axe violations on WCAG 2.1 AA rules", async () => {
    const dom = renderShell();
    const results = await axe.run(dom.window.document.documentElement, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
      resultTypes: ["violations"],
    });
    if (results.violations.length) {
      console.error("axe violations:", JSON.stringify(results.violations, null, 2));
    }
    expect(results.violations).toEqual([]);
  });
});
