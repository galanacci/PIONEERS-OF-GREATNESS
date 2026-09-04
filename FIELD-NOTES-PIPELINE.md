# Field Notes Instagram pipeline

The Field Notes archive is generated from Instagram through Meta's official API. The public website never receives the access token.

## One-time setup

1. Confirm that the Instagram account is a Creator or Business account.
2. Create a Meta app and connect the Instagram account.
3. Generate an Instagram User access token with permission to read the account's media.
4. In the GitHub repository, open **Settings → Secrets and variables → Actions**.
5. Add these repository secrets:

   - `INSTAGRAM_ACCESS_TOKEN`: the private access token.
   - `INSTAGRAM_USER_ID`: the connected Instagram account ID. This is optional when the token supports `me`.

Never place either value in HTML, JavaScript, JSON or a committed `.env` file.

## Running a sync

1. Open the repository's **Actions** tab.
2. Select **Sync Instagram Field Notes**.
3. Choose **Run workflow**.
4. Wait for the workflow to create or update the `Sync Instagram Field Notes` pull request.
5. Review captions, image order and presentation.
6. Merge the pull request into `dev` only when the archive looks right.

The workflow also checks for new posts every Monday morning. It never publishes directly to the live `main` branch.

## Content rules

The sync includes the account's complete available post history (using `2010-01-01T00:00:00Z`, Instagram's launch year, as the lower boundary) and records:

- original caption
- publication date
- original Instagram permalink
- image or video thumbnail
- every image in a carousel, in its original order

Downloaded media is stored under `src/field-notes/`. Generated content is stored in `data/field-notes.json`.

## Local test

PowerShell:

```powershell
$env:INSTAGRAM_ACCESS_TOKEN = "your-temporary-token"
$env:INSTAGRAM_USER_ID = "your-instagram-user-id"
node scripts/sync-instagram.mjs
Remove-Item Env:INSTAGRAM_ACCESS_TOKEN
Remove-Item Env:INSTAGRAM_USER_ID
```

Do not paste a real token into Codex, source files, screenshots or chat. Configure it directly in GitHub Secrets.
