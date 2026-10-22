# Photo Cleaner: implementation plan

Goal: find photos in Google Photos that are probably not worth keeping, let Coin
review them on his phone, then move the rest to the bin. The bin keeps them for
30 days.

All testing happens on a spare Google account first, with the
102 photos from `~/Pictures/He Lin Convo (Fam)`.

## Stage 1: Load the Toolkit without Tampermonkey
**Goal**: Google Photos Toolkit v3.3.0 runs on photos.google.com from our own extension.
**Success Criteria**: The GPTK button appears. `await gptkApi.getItemsByUploadedDate()` in the console returns photos.
**Tests**: `test/extension.test.js`: the manifest scope, the MAIN world, the script order, the Toolkit hash and the shim.
**Status**: In Progress (built and tested; not yet loaded in Chrome)

## Stage 2: The review loop by hand, with no AI
**Goal**: Put 20 photos into an album named "Review – test". Coin removes 5 on his phone. The other 15 go to the bin.
**Success Criteria**: The bin holds exactly those 15. One can be restored. The spare account still works a few days later.
**Tests**: None automated. It is run from the console with `gptkApiUtils.addToNewAlbum`, `getAllMediaInAlbum` and `moveToTrash`.
**Status**: Not Started

## Stage 3: Claude marks the photos
**Goal**: Thumbnails go to Claude, and photos marked "probably delete" go into the Review album with a reason.
**Success Criteria**: Run on the 102 test photos, with the cost measured.
**Tests**: Parsing Claude's answer; choosing which photos go to the album.
**Status**: Not Started. Open question: where the API key lives, so that it is never in the page.

## Stage 4: Run on the main account
**Goal**: One month of the main library at a time.
**Success Criteria**: Coin has a backup first (Google Takeout, about 80 GB), or he accepts the risk.
**Status**: Not Started
