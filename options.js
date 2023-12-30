'use strict';

import { requestCorsPermissionMetadata, requestCorsPermissionScihub } from './helper_js/permissions-manager.js';

// Field access
const propnameFieldnameMap = {
  "autodownload": "autodownload",
  "autoname": "autoname",
  "open-in-new-tab": "newtab",
  "autocheck-server": "autocheck",
  "scihub-url": "url"
};
function getField(propname) {
  return document.getElementById(propnameFieldnameMap[propname]);
}
var propnameValueCache = {};

// Initialization
function initFields() {
  initializeBool("autodownload", autodownloadCallback);
  initializeBool("autoname", autonameCallback);
  initializeBool("open-in-new-tab");
  initializeBool("autocheck-server", autocheckServerCallback);
  initializeString("scihub-url", true, scihuburlCallback);
  autodownloadCallback(propnameValueCache["autodownload"]);
  autonameCallback(propnameValueCache["autoname"]);
  autocheckServerCallback(propnameValueCache["autocheck-server"]);
};
function initializeString(propname, isUrl, alternateCallback) {
  if (!alternateCallback) alternateCallback = () => { return Promise.resolve(null) };
  let field = getField(propname);
  field.style.backgroundColor = "#aaa";
  field.value = propnameValueCache[propname];
  field.onchange = function () {
    field.onkeyup();
    updateStorage(field.value, propname);
    alternateCallback(field.value).catch(
      (reason) => { chrome.extension.getBackgroundPage().alert(reason); });
  };
  field.onkeyup = function () {
    if (isUrl) {
      field.style.backgroundColor = "#aaa";
      master_link_count = [0, 0];
      setTimeout(checkServerStatus, 250, field.value, function (success) {
        update_master_link_count(field.style, success);
      });
    }
  };
  field.onkeyup(); // colorize the initial text box
}
function initializeBool(propname, alternateCallback) {
  if (!alternateCallback) alternateCallback = () => { return Promise.resolve(null) };
  let field = getField(propname);
  field.checked = propnameValueCache[propname];
  field.onchange = function () {
    console.log(propname + " callback!");
    alternateCallback(field.checked)
      .then(() => { updateStorage(field.checked, propname); })
      .catch(
        // (reason) => { chrome.extension.getBackgroundPage().alert(reason); });
        (reason) => { alert(reason); console.log("Rejected due to ", reason); }
      );
  };
}

// Alert modal
async function doAlert() {
  const data = await browser.storage.local.get('error-message')
  if (!data['error-message']) return;
  browser.storage.local.remove('error-message'); // clear the error message so it doesn't show up again
  console.log('error message is: ', data['error-message']);
  document.querySelector('#error-message').textContent = data['error-message'];
  document.querySelector(".modal").style.display = 'block';
}
doAlert();
document.getElementById("close-modal").addEventListener("click", function () {
  document.querySelector(".modal").style.display = 'none';
});

// Callbacks
function autodownloadCallback(checked) {
  console.log("autodownload callback: " + checked);
  getField("autoname").disabled = !checked;
  getField("open-in-new-tab").disabled = checked;
  if (checked) {
    return new Promise((resolve, reject) => {
      requestCorsPermissionScihub(propnameValueCache["scihub-url"])
        .then(
          (reason) => {
            getField("open-in-new-tab").checked = false;
            console.log("completed scihub callback"); resolve(reason)
          })
        .catch(
          (reason) => {
            console.log("Scihub permission request failed");
            updateStorage(false, "autodownload");
            getField("autodownload").checked = false;
            getField("autoname").disabled = true;
            getField("open-in-new-tab").disabled = false;
            reject(reason);
          });
    });
  } else {
    return Promise.resolve("no additional permissions required");
  }
};
function autonameCallback(checked) {
  console.log("autoname callback: " + checked);
  if (checked) {
    return new Promise((resolve, reject) => {
      requestCorsPermissionMetadata()
        .then(
          (reason) => { console.log("completed metadata callback"); resolve(reason) })
        .catch(
          (reason) => {
            console.log("Metadata permission request failed");
            updateStorage(false, "autoname");
            getField("autoname").checked = false;
            reject(reason);
          });
    });
  } else {
    return Promise.resolve("no additional permissions required");
  }
}
function autocheckServerCallback(checked) {
  console.log("autocheckServer callback: " + checked);
  if (checked) {
    return new Promise((resolve, reject) => {
      requestCorsPermissionScihub(propnameValueCache["scihub-url"])
        .then(
          (reason) => { console.log("completed scihub callback"); resolve(reason) })
        .catch(
          (reason) => {
            console.log("Scihub permission request failed");
            updateStorage(false, "autocheck-server");
            getField("autocheck-server").checked = false;
            reject(reason);
          });
    });
  } else {
    return Promise.resolve("no additional permissions required");
  }
};
function scihuburlCallback(url) {
  console.log("url callback");
  return autodownloadCallback(propnameValueCache["autodownload"]);
}

// Variable storage
function updateStorage(val, propname) {
  propnameValueCache[propname] = val;
  var obj = {};
  obj[propname] = val;
  chrome.storage.local.set(obj);
  console.log("updated storage for " + propname + ": " + val);
};

// Run start code here
chrome.storage.local.get(Object.keys(propnameFieldnameMap), function (result) {
  for (const [key, value] of Object.entries(result)) {
    propnameValueCache[key] = value;
  }
  console.log("result is: ", result);
  console.log("cache is: ", propnameValueCache);
  initFields();
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    for (const key in changes) {
      const value = changes[key].newValue;
      if (value == propnameValueCache[key]) { // prevent infinite recursion
        continue;
      }
      propnameValueCache[key] = value;
      switch (key) {
        case "scihub-url":
          getField("scihub-url").value = value;
          break;
        case "autodownload":
        case "autoname":
        case "open-in-new-tab":
        case "autocheck-server":
          getField(key).checked = value;
          break;
        default:
          continue;
      }
      getField(key).onchange();
    }
  }
});










// Code related to color-coding and populating sci-hub links
let FILES_TO_CHECK = ["favicon.ico", "misc/img/raven_1.png", "pictures/ravenround_hs.gif"]
function checkServerStatus(domain, callback) {
  if (domain.charAt(domain.length - 1) != '/')
    domain = domain + '/';
  for (const file of FILES_TO_CHECK.values())
    checkServerStatusHelper(domain + file, callback);
}
function checkServerStatusHelper(testurl, callback) {
  var img = document.body.appendChild(document.createElement("img"));
  img.height = 0;
  img.style.display = "none";
  img.onload = function () {
    callback && callback.constructor == Function && callback(true);
  };
  img.onerror = function () {
    callback && callback.constructor == Function && callback(false);
  }
  img.src = testurl;
}
var master_link_count = [0, 0];
function update_master_link_count(obj, success) {
  master_link_count[0] += 1
  if (success) master_link_count[1] += 1;
  console.log("from url link, we got a " + success + ", counts is now:", master_link_count);
  if ((master_link_count[1] == 0) && (master_link_count[0] == FILES_TO_CHECK.length)) {
    obj.backgroundColor = "pink";
  } else if (master_link_count[1] == 1) {
    obj.backgroundColor = "yellow";
  } else if (master_link_count[1] > 1) {
    obj.backgroundColor = "lightgreen";
  }
  console.log("colored: ", obj);
}
var links_counts = [];
function update_counts(i, success) {
  var counts = links_counts[i];
  counts[0] += 1;
  if (success) counts[1] += 1;
  console.log("from link: " + i + ", we got a " + success + ", counts is now:", links_counts);
  if ((counts[1] == 0) && (counts[0] == FILES_TO_CHECK.length)) {
    linkstable.rows[i + 1].bgColor = "pink";
  } else if (counts[1] == 1) {
    linkstable.rows[i + 1].bgColor = "yellow";
  } else if (counts[1] > 1) {
    linkstable.rows[i + 1].bgColor = "lightgreen";
  }
  console.log("colored: ", linkstable.rows[i + 1]);
}

// Currently unused method of checking the server alive state.  Requires host / CORS permissions.
function checkServer(url, timeout) {
  const controller = new AbortController();
  const signal = controller.signal;
  const options = { mode: 'no-cors', signal };
  return fetch(url, options)
    .then(setTimeout(() => { controller.abort() }, timeout))
    .then(response => console.log('Check server response:', response.statusText, response.ok, response.text(), response.body, response))
    .catch(error => console.error('Check server error:', error.message));
}

// Fetch data from database
const databaseRoot = "https://raw.githubusercontent.com/emaballarin/sci-hub-now/master/data/";
// const databaseRoot = "data/"; // For local testing
// fetch urls
var links;
var linkstable = document.getElementById("links");
function setUrl(i) {
  const field = getField("scihub-url");
  field.value = links[i];
  propnameValueCache["scihub-url"] = links[i];
  field.onchange();
  // updateStorage(links[i], "scihub-url");
  // field.style.backgroundColor = linkstable.rows[parseInt(i) + 1].bgColor;
}
function fillUrls() {
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      links = JSON.parse(this.responseText);
      for (const i in links) {
        links_counts.push([0, 0]);
        linkstable.insertRow();
        linkstable.rows[linkstable.rows.length - 1].innerHTML = "<td>" + links[i] + '</td><button id="link' + i + '">Select</button>';
        document.getElementById("link" + i).onclick = function () { setUrl(i); }
      }
      console.log(linkstable.rows[links.length])
      console.log(links);
      for (const i in links) {
        linkstable.rows[parseInt(i) + 1].bgColor = "#aaa";
        setTimeout(checkServerStatus, 250, links[i], function (success) {
          update_counts(parseInt(i), success)
        })
        // checkServer(links[i], 1000).then(success => {
        //   linkstable.rows[parseInt(i) + 1].bgColor = "lightgreen";
        // }).catch(error => {
        //   linkstable.rows[parseInt(i) + 1].bgColor = "pink";});
      }
    }
  };
  xmlhttp.open("GET", databaseRoot + "activelinks.json", true);
  xmlhttp.send();
}
fillUrls();

// Fetch venue abbreviations
function getVenueAbbreviations() {
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      const venueAbbreviations = JSON.parse(this.responseText);
      console.log("venue abbreviations:", venueAbbreviations);
      updateStorage(venueAbbreviations, "venue-abbreviations");
    }
  };
  xmlhttp.open("GET", databaseRoot + "venue-abbreviations.json", true);
  xmlhttp.send();
}
getVenueAbbreviations();
