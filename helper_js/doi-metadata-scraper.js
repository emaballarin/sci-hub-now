import { venueAbbreviations } from "./config.js";

const metadataRegex = new RegExp(/.*?\|([^\|]+?)\|([^\|]+?)\|[^\|]*?\|[^\|]*?\|[^\|]*?\|([^\|]+?)\|[^\|]*?\|([^\|]*?)\|([^\|]*)/);

const EMAIL = 'emanuele@ballarin.cc';
function getApiQueryUrl(doi, email = EMAIL) {
  return 'https://doi.crossref.org/servlet/query' + '?pid=' + email + '&id=' + doi;
}

function createFilenameFromMetadata(md) {
  if (!md)
    return undefined;
  return md.authorlastname + md.yearmod100 + md.shortvenue + "_" + md.shorttitle + '.pdf';
}

function extractLastName(fullname) {
  let lastname = fullname.match(/.*\s(.*)/);
  if (lastname) {
    return lastname[1];
  } else {
    return fullname;
  }
};

function abbreviateVenue(venue) {
  // First loop through our hard-coded list
  for (const property in venueAbbreviations) {
    if (venue.includes(property)) {
      console.log("venue " + venue + " - found " + property + ": " + venueAbbreviations[property] + " in lookup table")
      return venueAbbreviations[property].toLowerCase();
    }
  }
  // If it has parentheses, then that's probably the abbreviation (e.g. IEEE often does this)
  let inParen = venue.match(/\((.*)\)/);
  if (inParen && (inParen[1].length < 8)) {
    console.log("venue " + venue + " - found parentheses: ", inParen);
    return inParen[1].toLowerCase();
  }
  // If it doesn't match any entries, then just take the first letter of each capitalized word.
  console.log("venue " + venue + "resorting to first letter of each capital word");
  let capitalLetters = venue.match(/[A-Z][a-z]/g); // first 2 letters (lowercase makes sure it's a word)
  capitalLetters.forEach((v, i) => { capitalLetters[i] = v[0] }); // drop second letter of each chunk
  return capitalLetters.join('').toLowerCase();
};

function extractMetadata(metadata_str) {
  console.log("metadata html contents:", metadata_str);
  let matches = metadata_str.match(metadataRegex);
  if (!matches) {
    doAlert("Error 27: Could not parse the metadata file!\n\n" + metadata_str + "\nSaving with default filename.").then(() => { return null });
    return null;
  }
  let metadata = {
    venue: matches[1],
    author: matches[2],
    year: matches[3],
    shorttitle: matches[4],
    doi: matches[5],
  };
  metadata.authorlastname = extractLastName(metadata.author);
  metadata.shortvenue = abbreviateVenue(metadata.venue);
  metadata.yearmod100 = metadata.year.slice(-2);

  console.log("metadata extracted:", metadata);
  return metadata;
};

export { getApiQueryUrl, createFilenameFromMetadata, extractMetadata };
