# UNCUT Documentary Pipeline

The public UNCUT YouTube playlist is the source of truth for the Documentary Screening Room.

## One-time setup

1. In Google Cloud Console, create or select the PIONEERS OF GREATNESS project.
2. Enable **YouTube Data API v3**.
3. Create an API key and restrict it to **YouTube Data API v3**.
4. In GitHub, open **Settings → Secrets and variables → Actions**.
5. Add a repository secret named `YOUTUBE_API_KEY`.
6. Run **Sync YouTube Documentary** from the repository Actions tab.
7. Review and merge the generated pull request into `dev`.

## Ongoing use

- Add, remove or reorder UNCUT videos in the YouTube playlist.
- The workflow checks the playlist every Monday and can also be run manually.
- Changes are written to `data/documentary.json`.
- Every automated update opens a review pull request against `dev`; it never publishes directly to `main`.

The playlist ID is stored in the workflow and sync script. The API key exists only as a GitHub secret and must never be committed.
