import { execSync } from 'child_process';
import { copyFileSync } from 'fs';
import ghpages from 'gh-pages';

console.log("Building project...");
execSync("npm run build", { stdio: 'inherit' });

console.log("Copying index.html to 404.html for GitHub Pages SPA support...");
copyFileSync("dist-capacitor/index.html", "dist-capacitor/404.html");

console.log("Publishing to GitHub Pages...");
ghpages.publish("dist-capacitor", (err) => {
  if (err) {
    console.error("Deploy failed:", err);
  } else {
    console.log("Deployed successfully to GitHub Pages!");
  }
});
