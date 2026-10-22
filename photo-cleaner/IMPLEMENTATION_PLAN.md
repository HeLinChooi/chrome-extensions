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
**Status**: Complete (22 Oct 2026: GPTK button shown; the spare account listed 215 items)

## Stage 2: The review loop by hand, with no AI
**Goal**: Put 20 photos into an album named "Review – test". Coin removes 5 on his phone. The other 15 go to the bin.
**Success Criteria**: The bin holds exactly those 15. One can be restored. The spare account still works a few days later.
**Tests**: None automated. It is run from the console with `gptkApiUtils.addToNewAlbum`, `getAllMediaInAlbum` and `moveToTrash`.
**Status**: Complete. On 22 Oct 2026 the album was made, 5 were removed on the phone, and the script moved the other 15 to the bin. The 5 stayed in the library, the bin held 15, and one restore worked. Before Stage 4, check that the spare account still works normally.

Learned in this stage:
- Every `gptkApiUtils` helper quietly does nothing unless `gptkCore.isProcessRunning` is `true`. The GPTK button sets it. Console code must set it, and reset it to `false` at the end.
- Coin found that the phone app can move photos to the bin from inside an album he owns. So the script could stop at making the Review album, and he would delete from the album himself in Google's app. That keeps the riskiest step out of the script.

## Stage 3: Claude marks the photos
**Goal**: Thumbnails go to Claude, and photos marked "probably delete" go into the Review album with a reason.
**Success Criteria**: Run on the 102 test photos, with the cost measured.
**Tests**: `test/classify.test.js`: batching, the request content, and parsing the answer (skipped or unknown verdicts are kept).
**Status**: In Progress. The key lives in the background worker, as in Tab Triage. The script makes the Review album only; deleting is done by hand in the app.

First run, 22 Oct 2026, 98 photos: 31 marked delete, 18,051 tokens in and 3,652 out (about US$0.004). Coin's feedback, applied in 0.3.0:
- "Equally good" near-copies were deleted. Now a group of 2 or 3 loses one only if another is clearly better, and a group of 4 or more keeps the best 2.
- Reasons named "photo 8", a number Coin cannot see, and a timestamp was not enough either. Now a review panel shows each photo with the one kept instead.
- Upside-down photos are correctly marked delete.

Next: run 0.3.0 on the same day and compare.

## Later: unsure photos to Lightroom
Coin has 1 TB of Lightroom cloud storage. Photos that are neither clearly good nor clearly bad could be copied there before he decides. Not designed yet; first check what Adobe offers for uploading.

## Stage 4: Run on the main account
**Goal**: One month of the main library at a time.
**Success Criteria**: Coin has a backup first (Google Takeout, about 80 GB), or he accepts the risk.
**Status**: Not Started
