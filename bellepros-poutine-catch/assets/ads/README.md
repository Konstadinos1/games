# Your promo videos (in-game ads)

When a player taps **"Watch ad → revive"** after a game over, the game plays
one of *your* promo videos as the ad. There are two easy ways to add them.

## Option A — drop files here (recommended)
1. Copy your video file(s) into this folder, e.g. `promo1.mp4`, `combo.mp4`.
   Use web-friendly **MP4 (H.264 + AAC)**, ideally short (10–30s) and portrait.
2. Open `bellepros-poutine-catch/index.html`, find `const AD_VIDEOS = [`
   near the top of the script, and list them:
   ```js
   const AD_VIDEOS = [
     'assets/ads/promo1.mp4',
     'assets/ads/combo.mp4',
   ];
   ```
That's it — videos are picked at random each time.

## Option B — no code edit (in-app owner panel)
On the start screen, **triple-tap the Bellepro's logo** to open the owner
panel, paste one video URL per line (file paths or full https URLs), and
**Save**. They're stored on the device and used immediately. "Clear" removes
them. You can also pass `?adv=URL1,URL2` in the page URL once to set them.

If no videos are configured, the game shows its built-in animated combo ad.
