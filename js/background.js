var itemsByNotificationId = {};
var itemsByExistingId = {};
var searchedItems = {};

chrome.downloads.onDeterminingFilename.addListener(function (downloadItem, suggest) {
  var searchFilter = {
    state: "complete",
    fileSize: downloadItem.fileSize,
    exists: true, 
    filenameRegex: downloadItem.filename
  };
  chrome.downloads.search(searchFilter, function (downloadItems) {
    if (downloadItems.length > 0) {
      console.log(downloadItems);
      itemsByExistingId[downloadItems[0].id] = {exists: true};
      console.log("Current item " + downloadItems[0].id + " exists: " + downloadItems[0].exists);
      chrome.notifications.create({
        type: "basic",
        iconUrl: "images/icon128.png",
        title: "File already exists",
        message: "It seems like the file " + downloadItem.filename + " already exists",
        contextMessage: "Click to show the file",
        isClickable: true,
        buttons: [
          {title: "Open existing file", iconUrl: "images/open.png"},
          {title: "Download anyway", iconUrl: "images/download.png"}
        ]
      }, function (notificationId) {
        if (itemsByExistingId[downloadItems[0].id].exists) {
          itemsByNotificationId[notificationId] = {foundItem: downloadItems[0], downloadItem: downloadItem, suggest: suggest};
          itemsByExistingId[downloadItems[0].id] = {notificationId: notificationId, suggest: suggest};
        } else {
          chrome.notifications.clear(notificationId);
          suggest();
        }
      });
    } else {
      suggest();
    }
  });
  return true;
});

chrome.downloads.onChanged.addListener(function (downloadDelta) {
  console.log(downloadDelta);
  if (itemsByExistingId[downloadDelta.id]) {
    if (downloadDelta.exists && downloadDelta.exists.previous === true && downloadDelta.exists.current === false) {
      itemsByExistingId[downloadDelta.id] = {exists: false};
    }
  }
});

chrome.notifications.onClosed.addListener(function (notificationId, byUser) {
  if (itemsByNotificationId[notificationId]) {
    console.log(itemsByNotificationId[notificationId]);
    chrome.downloads.cancel(itemsByNotificationId[notificationId].downloadItem.id);
    chrome.downloads.erase({id: itemsByNotificationId[notificationId].downloadItem.id});
    delete itemsByExistingId[itemsByNotificationId[notificationId].foundItem.id];
    delete itemsByNotificationId[notificationId];
  }
});

chrome.notifications.onButtonClicked.addListener(function (notificationId, buttonIndex) {
  if (itemsByNotificationId[notificationId]) {
    if (buttonIndex === 0) {
      chrome.notifications.clear(notificationId);
      chrome.downloads.cancel(itemsByNotificationId[notificationId].downloadItem.id);
      chrome.downloads.erase({id: itemsByNotificationId[notificationId].downloadItem.id});
      chrome.downloads.open(itemsByNotificationId[notificationId].foundItem.id);
    } else if (buttonIndex === 1) {
      chrome.notifications.clear(notificationId);
      itemsByNotificationId[notificationId].suggest();
    }
    delete itemsByExistingId[itemsByNotificationId[notificationId].foundItem.id];
    delete itemsByNotificationId[notificationId];
  }
});

chrome.notifications.onClicked.addListener(function (notificationId) {
  if (itemsByNotificationId[notificationId]) {
    chrome.notifications.clear(notificationId);
    chrome.downloads.cancel(itemsByNotificationId[notificationId].downloadItem.id);
    chrome.downloads.erase({id: itemsByNotificationId[notificationId].downloadItem.id});
    chrome.downloads.show(itemsByNotificationId[notificationId].foundItem.id);
    delete itemsByExistingId[itemsByNotificationId[notificationId].foundItem.id];
    delete itemsByNotificationId[notificationId];
  }
});