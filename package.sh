#
# 1. Find-all-replace old version number with new version number (except in CHANGELOG file), update CHANGELOG, and push to github (needed for activelinks.json)
#
# 2. Run `web-ext build -i data icons/outline.sh package.sh` (note: `-i` flag means "ignore") (or maybe just do step 4 instead?)
#
#
web-ext build -i data icons/outline.sh package.sh
#
#
# 3. Upload .zip to Firefox add-on developer dashboard to get a .xpi file and save it to the `web-ext-artifacts` folder.
#    Note: it might take a couple minutes for the .zip file in "Files" to get changed to a .xpi file.
